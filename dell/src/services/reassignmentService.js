import { requireInsforge } from '../lib/insforgeClient'

function db() {
  return requireInsforge().database
}

function isMissingTableError(error) {
  if (!error) return false
  const message = String(error.message || error.details || error.hint || '').toLowerCase()
  const code = String(error.code || '').toLowerCase()
  return (
    message.includes('does not exist') ||
    message.includes('not found') ||
    message.includes('reassignment_requests') ||
    code === '42p01' ||
    error.status === 404
  )
}

function isRlsError(error) {
  if (!error) return false
  const message = String(error.message || error.details || '').toLowerCase()
  const code = String(error.code || '').toLowerCase()
  return (
    message.includes('row-level security') ||
    message.includes('row level security') ||
    message.includes('policy') ||
    code === '42501'
  )
}

export function parseReassignmentError(error) {
  if (!error) return 'Unable to notify your youth worker.'

  if (isMissingTableError(error)) {
    return 'Reassignment is not set up on the backend yet. Contact your administrator.'
  }

  if (isRlsError(error)) {
    return 'Database permissions blocked this action. Please try again.'
  }

  return error.message || 'Unable to notify your youth worker.'
}

export async function getLatestReassignmentRequest(youthId, { requestedBy } = {}) {
  let query = db()
    .from('reassignment_requests')
    .select('*')
    .eq('youth_id', youthId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  if (requestedBy) {
    query = query.eq('requested_by', requestedBy)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingTableError(error)) return { request: null, tablesReady: false }
    throw error
  }
  return { request: data, tablesReady: true }
}

export async function createReassignmentRequest({
  youthId,
  requestedBy,
  requesterProfileId,
  assignedStaffId = null,
  reason,
}) {
  const trimmed = String(reason || '').trim()
  if (!trimmed) throw new Error('Please choose a reason.')

  const payload = {
    youth_id: youthId,
    requested_by: requestedBy,
    requester_profile_id: requesterProfileId,
    assigned_staff_id: assignedStaffId,
    reason: trimmed,
  }

  const { error: insertError } = await db().from('reassignment_requests').insert([payload])

  if (insertError) {
    throw new Error(parseReassignmentError(insertError))
  }

  const { request } = await getLatestReassignmentRequest(youthId, { requestedBy })
  if (request) return request

  return {
    ...payload,
    id: null,
    status: 'pending',
    created_at: new Date().toISOString(),
  }
}

export async function getPendingReassignmentsForYouthIds(youthIds) {
  if (!youthIds?.length) return {}

  const data = await safeOptionalQuery(
    db()
      .from('reassignment_requests')
      .select('*')
      .in('youth_id', youthIds)
      .eq('status', 'pending')
      .eq('requested_by', 'youth')
      .order('created_at', { ascending: false }),
    'reassignment_requests',
  )

  if (!data) return {}

  return data.reduce((acc, row) => {
    if (!acc[row.youth_id]) acc[row.youth_id] = row
    return acc
  }, {})
}

async function getActiveAssignmentStartedAt(youthRow) {
  if (!youthRow?.id || !youthRow?.assigned_staff_id) return null

  const data = await safeOptionalQuery(
    db()
      .from('assigned_workers')
      .select('assigned_at')
      .eq('youth_id', youthRow.id)
      .eq('staff_id', youthRow.assigned_staff_id)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'assigned_workers',
  )

  return data?.assigned_at || null
}

export async function getYouthVisibleReassignmentRequest(youthRow, { requestedBy = 'youth' } = {}) {
  const { request } = await getLatestReassignmentRequest(youthRow?.id, { requestedBy })
  if (!request) return null

  const assignmentStartedAt = await getActiveAssignmentStartedAt(youthRow)
  if (!shouldShowPendingReassignment(youthRow, request, assignmentStartedAt)) {
    return null
  }

  return request
}

export async function closeReassignmentRequest(requestId) {
  const { data, error } = await db()
    .from('reassignment_requests')
    .update({ status: 'closed' })
    .eq('id', requestId)
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error)) return null
    throw error
  }
  return data
}

export async function closePendingReassignmentForYouth(youthId) {
  const { error } = await db()
    .from('reassignment_requests')
    .update({ status: 'closed' })
    .eq('youth_id', youthId)
    .eq('status', 'pending')
    .eq('requested_by', 'youth')

  if (error && !isMissingTableError(error) && !isRlsError(error)) throw error
}

export function shouldShowPendingReassignment(youthRow, request, assignmentStartedAt) {
  if (!request || !youthRow) return false
  if (!youthRow.assigned_staff_id) return false
  if (request.assigned_staff_id !== youthRow.assigned_staff_id) return false

  const requestedAt = new Date(request.created_at || 0).getTime()
  const youthUpdated = new Date(youthRow.updated_at || 0).getTime()

  if (youthUpdated > requestedAt) return false

  if (assignmentStartedAt) {
    const startedAt = new Date(assignmentStartedAt).getTime()
    return requestedAt >= startedAt
  }

  return true
}

async function safeOptionalQuery(queryPromise, label) {
  const { data, error } = await queryPromise
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(`[reassignment] optional table unavailable (${label}):`, error.message)
      return null
    }
    if (isRlsError(error)) {
      console.warn(`[reassignment] optional query denied (${label}):`, error.message)
      return null
    }
    throw error
  }
  return data
}
