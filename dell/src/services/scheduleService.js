import { requireInsforge } from '../lib/insforgeClient'
import { formatDateKey } from '../lib/calendarRange'
import { buildDefaultSlots, hourToEndTime, hourToTime } from '../lib/scheduleSlots'

function db() {
  return requireInsforge().database
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUuid(value, label) {
  if (!value || value === 'undefined' || !UUID_PATTERN.test(String(value))) {
    throw new Error(`${label} is missing. Please refresh and try again.`)
  }
  return String(value)
}

function isMissingTableError(error) {
  if (!error) return false
  const message = String(error.message || error.details || error.hint || '').toLowerCase()
  const status = error.status ?? error.statusCode
  return (
    status === 404 ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('does not exist') ||
    (message.includes('relation') && message.includes('exist'))
  )
}

async function safeQuery(queryPromise, label) {
  const { data, error } = await queryPromise
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(`[schedule] table unavailable (${label}):`, error.message)
      return null
    }
    throw error
  }
  return data
}

function monthRange(year, month) {
  const start = formatDateKey(year, month, 1)
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const end = formatDateKey(next.year, next.month, 1)
  return { start, end }
}

function normalizeTime(value) {
  if (!value) return value
  return value.length === 5 ? `${value}:00` : value.slice(0, 8)
}

function slotKey(slotDate, startTime) {
  return `${slotDate}|${normalizeTime(startTime)}`
}

export async function getStaffScheduleForMonth(staffId, year, month) {
  assertUuid(staffId, 'Staff profile')
  const { start, end } = monthRange(year, month)
  const [slots, notes] = await Promise.all([
    safeQuery(
      db()
        .from('staff_schedule_slots')
        .select('*')
        .eq('staff_id', staffId)
        .gte('slot_date', start)
        .lt('slot_date', end)
        .order('slot_date')
        .order('start_time'),
      'staff_schedule_slots',
    ),
    safeQuery(
      db()
        .from('staff_schedule_day_notes')
        .select('*')
        .eq('staff_id', staffId)
        .gte('note_date', start)
        .lt('note_date', end),
      'staff_schedule_day_notes',
    ),
  ])

  return {
    slots: slots || [],
    notes: notes || [],
    tablesReady: slots !== null,
  }
}

export async function getStaffDayNote(staffId, dateKey) {
  assertUuid(staffId, 'Staff profile')
  const data = await safeQuery(
    db()
      .from('staff_schedule_day_notes')
      .select('*')
      .eq('staff_id', staffId)
      .eq('note_date', dateKey)
      .maybeSingle(),
    'staff_schedule_day_notes',
  )
  return data?.notes || ''
}

export async function saveStaffDayNote(staffId, dateKey, notes) {
  assertUuid(staffId, 'Staff profile')
  const trimmed = notes.trim()
  if (!trimmed) {
    await safeQuery(
      db().from('staff_schedule_day_notes').delete().eq('staff_id', staffId).eq('note_date', dateKey),
      'staff_schedule_day_notes',
    )
    return ''
  }

  const { data, error } = await db()
    .from('staff_schedule_day_notes')
    .upsert([{ staff_id: staffId, note_date: dateKey, notes: trimmed }], {
      onConflict: 'staff_id,note_date',
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingTableError(error)) return trimmed
    throw error
  }
  return data?.notes || trimmed
}

export async function upsertStaffSlot({
  staffId,
  slotDate,
  startHour,
  status,
  youthId = null,
  notes = null,
}) {
  assertUuid(staffId, 'Staff profile')
  if (youthId) assertUuid(youthId, 'Youth profile')
  const startTime = hourToTime(startHour)
  const endTime = hourToEndTime(startHour)
  const payload = {
    staff_id: staffId,
    slot_date: slotDate,
    start_time: startTime,
    end_time: endTime,
    status,
    youth_id: status === 'booked' ? youthId : null,
    notes,
  }

  const { data, error } = await db()
    .from('staff_schedule_slots')
    .upsert([payload], { onConflict: 'staff_id,slot_date,start_time' })
    .select('*')
    .single()

  if (error) {
    if (isMissingTableError(error)) return payload
    throw error
  }
  return data
}

export async function deleteStaffSlot(staffId, slotDate, startHour) {
  const { error } = await db()
    .from('staff_schedule_slots')
    .delete()
    .eq('staff_id', staffId)
    .eq('slot_date', slotDate)
    .eq('start_time', hourToTime(startHour))

  if (error && !isMissingTableError(error)) throw error
}

export function mergeStaffDaySlots(slotDate, storedSlots = []) {
  const map = new Map(storedSlots.map((slot) => [slotKey(slot.slot_date, slot.start_time), slot]))
  return buildDefaultSlots().map((template) => {
    const stored = map.get(slotKey(slotDate, template.startTime))
    return {
      ...template,
      id: stored?.id || null,
      status: stored?.status || 'available',
      youthId: stored?.youth_id || null,
      notes: stored?.notes || '',
    }
  })
}

export async function getYouthFreeSlotsForMonth(youthId, year, month) {
  assertUuid(youthId, 'Youth profile')
  const { start, end } = monthRange(year, month)
  const data = await safeQuery(
    db()
      .from('youth_free_slots')
      .select('*')
      .eq('youth_id', youthId)
      .gte('slot_date', start)
      .lt('slot_date', end)
      .order('slot_date')
      .order('start_time'),
    'youth_free_slots',
  )
  return data || []
}

export async function toggleYouthFreeSlot(youthId, slotDate, startHour) {
  assertUuid(youthId, 'Youth profile')
  const startTime = hourToTime(startHour)
  const { data: existing, error: findError } = await db()
    .from('youth_free_slots')
    .select('id')
    .eq('youth_id', youthId)
    .eq('slot_date', slotDate)
    .eq('start_time', startTime)
    .maybeSingle()

  if (findError && !isMissingTableError(findError)) throw findError

  if (existing?.id) {
    const { error } = await db().from('youth_free_slots').delete().eq('id', existing.id)
    if (error && !isMissingTableError(error)) throw error
    return false
  }

  const { error } = await db().from('youth_free_slots').insert([
    {
      youth_id: youthId,
      slot_date: slotDate,
      start_time: startTime,
      end_time: hourToEndTime(startHour),
    },
  ])

  if (error && !isMissingTableError(error)) throw error
  return true
}

export function mergeYouthFreeDaySlots(slotDate, storedSlots = []) {
  const map = new Map(storedSlots.map((slot) => [slotKey(slot.slot_date, slot.start_time), slot]))
  return buildDefaultSlots().map((template) => ({
    ...template,
    isFree: map.has(slotKey(slotDate, template.startTime)),
  }))
}

export function isVisibleConsultationRequest(request) {
  return request?.status !== 'withdrawn' && request?.status !== 'cancelled'
}

export function getRequestStatusLabel(request) {
  if (request.status === 'withdrawn') return 'Withdrawn'
  if (request.status === 'pending' && request.initiated_by === 'staff') return 'Staff requested'
  if (request.status === 'pending' && request.initiated_by === 'youth') return 'Pending'
  return request.status
}

async function youthHasFreeSlot(youthId, slotDate, startHour) {
  const startTime = hourToTime(startHour)
  const { data, error } = await db()
    .from('youth_free_slots')
    .select('id')
    .eq('youth_id', youthId)
    .eq('slot_date', slotDate)
    .eq('start_time', startTime)
    .maybeSingle()

  if (error) throw error
  return Boolean(data?.id)
}

async function releaseBookedSlot(request) {
  if (!request.staff_slot_id) {
    const startHour = Number(normalizeTime(request.start_time).slice(0, 2))
    await deleteStaffSlot(request.staff_id, request.slot_date, startHour)
    return
  }

  const { error } = await db()
    .from('staff_schedule_slots')
    .update({ status: 'available', youth_id: null })
    .eq('id', request.staff_slot_id)

  if (error && !isMissingTableError(error)) throw error
}

export async function getConsultationRequestsForStaff(staffId, { youthId = null, status = null } = {}) {
  assertUuid(staffId, 'Staff profile')
  if (youthId) assertUuid(youthId, 'Youth profile')
  let query = db()
    .from('consultation_requests')
    .select('*')
    .eq('staff_id', staffId)
    .order('slot_date')
    .order('start_time')

  if (youthId) query = query.eq('youth_id', youthId)
  if (status) query = query.eq('status', status)

  const data = await safeQuery(query, 'consultation_requests')
  return data || []
}

export async function getConsultationRequestsForYouth(youthId) {
  assertUuid(youthId, 'Youth profile')
  const data = await safeQuery(
    db()
      .from('consultation_requests')
      .select('*')
      .eq('youth_id', youthId)
      .order('created_at', { ascending: false }),
    'consultation_requests',
  )
  return data || []
}

export async function createConsultationRequest({
  youthId,
  staffId,
  slotDate,
  startHour,
  message = '',
}) {
  assertUuid(youthId, 'Youth profile')
  assertUuid(staffId, 'Staff profile')
  const startTime = hourToTime(startHour)
  const payload = {
    youth_id: youthId,
    staff_id: staffId,
    slot_date: slotDate,
    start_time: startTime,
    end_time: hourToEndTime(startHour),
    message: message.trim() || null,
    status: 'pending',
    initiated_by: 'youth',
  }

  const { data, error } = await db().from('consultation_requests').insert([payload]).select('*').single()
  if (error) throw error
  return data
}

export async function createStaffMeetingRequest({
  youthId,
  staffId,
  slotDate,
  startHour,
  message = '',
}) {
  assertUuid(youthId, 'Youth profile')
  assertUuid(staffId, 'Staff profile')

  const hasFreeSlot = await youthHasFreeSlot(youthId, slotDate, startHour)
  if (!hasFreeSlot) {
    throw new Error('The student is not free at this time anymore.')
  }

  const startTime = hourToTime(startHour)
  const payload = {
    youth_id: youthId,
    staff_id: staffId,
    slot_date: slotDate,
    start_time: startTime,
    end_time: hourToEndTime(startHour),
    message: message.trim() || null,
    status: 'pending',
    initiated_by: 'staff',
  }

  const { data, error } = await db().from('consultation_requests').insert([payload]).select('*').single()
  if (error) throw error
  return data
}

export async function withdrawConsultationRequest(requestId) {
  assertUuid(requestId, 'Consultation request')
  const { data, error } = await db()
    .from('consultation_requests')
    .update({ status: 'withdrawn' })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('This request cannot be withdrawn.')
  return data
}

/** @deprecated Use withdrawConsultationRequest for pending, cancelAcceptedConsultation for accepted */
export async function cancelConsultationRequest(requestId) {
  return withdrawConsultationRequest(requestId)
}

export async function cancelAcceptedConsultation(requestId) {
  assertUuid(requestId, 'Consultation request')
  const { data: request, error: fetchError } = await db()
    .from('consultation_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError) throw fetchError
  if (request.status !== 'accepted') {
    throw new Error('Only confirmed meetings can be cancelled this way.')
  }

  await releaseBookedSlot(request)

  const { data, error } = await db()
    .from('consultation_requests')
    .update({ status: 'withdrawn' })
    .eq('id', requestId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export function buildPendingRequestMap(requests = []) {
  const map = new Map()
  for (const request of requests) {
    if (request.status !== 'pending') continue
    map.set(`${request.slot_date}|${normalizeTime(request.start_time).slice(0, 5)}`, request)
  }
  return map
}

export async function respondToConsultationRequest(requestId, accept) {
  const { data: request, error: fetchError } = await db()
    .from('consultation_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError) throw fetchError
  if (request.status !== 'pending') throw new Error('This request has already been handled.')

  const newStatus = accept ? 'accepted' : 'rejected'
  const { data: updated, error: updateError } = await db()
    .from('consultation_requests')
    .update({ status: newStatus })
    .eq('id', requestId)
    .select('*')
    .single()

  if (updateError) throw updateError

  if (accept) {
    const startHour = Number(normalizeTime(request.start_time).slice(0, 2))
    const slot = await upsertStaffSlot({
      staffId: request.staff_id,
      slotDate: request.slot_date,
      startHour,
      status: 'booked',
      youthId: request.youth_id,
    })

    const { data: linked, error: linkError } = await db()
      .from('consultation_requests')
      .update({ staff_slot_id: slot.id || null })
      .eq('id', requestId)
      .select('*')
      .single()

    if (linkError) throw linkError
    return linked
  }

  return updated
}

export async function getWorkerScheduleForMonth(staffId, year, month) {
  return getStaffScheduleForMonth(staffId, year, month)
}

export function getMarkedDaysFromSlots(slots = []) {
  const days = new Set()
  for (const slot of slots) {
    if (slot.status !== 'available') {
      days.add(Number(slot.slot_date.split('-')[2]))
    }
  }
  return [...days]
}

export function getMarkedDaysFromNotes(notes = []) {
  return notes.map((note) => Number(note.note_date.split('-')[2]))
}

export function getMarkedDaysFromRequests(requests = []) {
  const days = new Set()
  for (const request of requests) {
    if (!isVisibleConsultationRequest(request)) continue
    days.add(Number(request.slot_date.split('-')[2]))
  }
  return [...days]
}
