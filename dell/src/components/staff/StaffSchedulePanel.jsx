import { useCallback, useEffect, useMemo, useState } from 'react'
import MonthCalendar from '../youth/MonthCalendar'
import {
  canNavigateMonth,
  formatDateKey,
  getCalendarWindow,
  getInitialCalendarMonth,
  getWindowLabel,
  shiftMonth,
} from '../../lib/calendarRange'
import { formatAppDate } from '../../lib/locale'
import { hourToTime } from '../../lib/scheduleSlots'
import {
  getMarkedDaysFromNotes,
  getMarkedDaysFromSlots,
  getStaffScheduleForMonth,
  mergeStaffDaySlots,
  saveStaffDayNote,
  SCHEDULE_TABLES_MISSING_MESSAGE,
  upsertStaffSlot,
} from '../../services/scheduleService'

const STATUS_CYCLE = {
  available: 'blocked',
  blocked: 'available',
  booked: 'booked',
}

const STATUS_STYLES = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  blocked: 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200',
  booked: 'border-sky-200 bg-sky-100 text-sky-800 cursor-default',
}

function SlotButton({ slot, onToggle, saving }) {
  const label =
    slot.status === 'available' ? 'Open' : slot.status === 'blocked' ? 'Blocked' : 'Booked'

  return (
    <button
      type="button"
      disabled={slot.status === 'booked' || saving}
      onClick={() => onToggle(slot)}
      className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${STATUS_STYLES[slot.status]}`}
    >
      <span className="block">{slot.label}</span>
      <span className="mt-0.5 block text-xs font-medium opacity-80">{label}</span>
    </button>
  )
}

export default function StaffSchedulePanel({ staffId }) {
  const window = useMemo(() => getCalendarWindow(), [])
  const initial = useMemo(() => getInitialCalendarMonth(), [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [monthData, setMonthData] = useState({ slots: [], notes: [], tablesReady: true })
  const [dayNoteDraft, setDayNoteDraft] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [savingSlot, setSavingSlot] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const selectedDateKey = formatDateKey(year, month, selectedDay)

  const markedDays = useMemo(() => {
    const slotDays = getMarkedDaysFromSlots(monthData.slots)
    const noteDays = getMarkedDaysFromNotes(monthData.notes)
    return [...new Set([...slotDays, ...noteDays])]
  }, [monthData])

  const daySlots = useMemo(
    () => mergeStaffDaySlots(selectedDateKey, monthData.slots),
    [selectedDateKey, monthData.slots],
  )

  const savedDayNote = useMemo(() => {
    const row = monthData.notes.find((note) => note.note_date === selectedDateKey)
    return row?.notes || ''
  }, [monthData.notes, selectedDateKey])

  useEffect(() => {
    setDayNoteDraft(savedDayNote)
  }, [savedDayNote, selectedDateKey])

  const loadMonth = useCallback(
    async ({ silent = false } = {}) => {
      if (!staffId) {
        if (!silent) setInitialLoading(false)
        return
      }
      if (!silent) setInitialLoading(true)
      setErrorMessage('')
      try {
        const data = await getStaffScheduleForMonth(staffId, year, month)
        setMonthData(data)
        if (!data.tablesReady) {
          setErrorMessage(SCHEDULE_TABLES_MISSING_MESSAGE)
        }
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load schedule.')
      } finally {
        if (!silent) setInitialLoading(false)
      }
    },
    [staffId, year, month],
  )

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  function handlePrevMonth() {
    const next = shiftMonth(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
    setSelectedDay(1)
  }

  function handleNextMonth() {
    const next = shiftMonth(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
    setSelectedDay(1)
  }

  async function handleToggleSlot(slot) {
    if (slot.status === 'booked') return
    setSavingSlot(true)
    setNotice('')
    setErrorMessage('')
    const nextStatus = STATUS_CYCLE[slot.status]
    const startTime = hourToTime(slot.startHour)
    try {
      await upsertStaffSlot({
        staffId,
        slotDate: selectedDateKey,
        startHour: slot.startHour,
        status: nextStatus,
      })
      setMonthData((prev) => {
        const others = prev.slots.filter(
          (row) => !(row.slot_date === selectedDateKey && row.start_time.startsWith(startTime.slice(0, 5))),
        )
        if (nextStatus === 'available') {
          return { ...prev, slots: others }
        }
        return {
          ...prev,
          slots: [
            ...others,
            {
              staff_id: staffId,
              slot_date: selectedDateKey,
              start_time: startTime,
              status: nextStatus,
            },
          ],
        }
      })
      setNotice(`Updated ${slot.label} to ${nextStatus}.`)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update slot.')
      await loadMonth({ silent: true })
    } finally {
      setSavingSlot(false)
    }
  }

  async function handleSaveNote() {
    setSavingNote(true)
    setNotice('')
    setErrorMessage('')
    try {
      const saved = await saveStaffDayNote(staffId, selectedDateKey, dayNoteDraft)
      setMonthData((prev) => {
        const others = prev.notes.filter((note) => note.note_date !== selectedDateKey)
        if (!saved.trim()) {
          return { ...prev, notes: others }
        }
        return {
          ...prev,
          notes: [...others, { staff_id: staffId, note_date: selectedDateKey, notes: saved }],
        }
      })
      setNotice('Day note saved.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save note.')
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <aside className="relative z-10 w-full border-b border-slate-100 bg-white p-4 lg:w-[22rem] lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-600">My Schedule</p>
        <h2 className="mt-1 text-lg font-bold text-slate-800">Availability</h2>
        <p className="mt-1 text-xs text-slate-500">Window: {getWindowLabel(window)}</p>
      </div>

      {errorMessage && (
        <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </p>
      )}

      {notice && (
        <p className="mb-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
          {notice}
        </p>
      )}

      {initialLoading ? (
        <p className="text-sm text-slate-500">Loading schedule…</p>
      ) : (
        <>
          <MonthCalendar
            year={year}
            month={month}
            markedDays={markedDays}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            canGoPrev={canNavigateMonth(year, month, 'prev', window)}
            canGoNext={canNavigateMonth(year, month, 'next', window)}
            allowAllDays
            legend="Tap a day to manage hourly slots. Dots mark days with bookings, blocks, or notes."
          />

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">
                {formatAppDate(selectedDateKey, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {daySlots.map((slot) => (
                  <SlotButton
                    key={slot.startHour}
                    slot={slot}
                    onToggle={handleToggleSlot}
                    saving={savingSlot}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Tap open slots to block them. Booked slots are set when you accept a student consultation.
              </p>
            </div>

            <div>
              <label htmlFor="staff-day-note" className="mb-1 block text-sm font-semibold text-slate-800">
                Notes for this date
              </label>
              <textarea
                id="staff-day-note"
                rows={3}
                value={dayNoteDraft}
                onChange={(event) => setDayNoteDraft(event.target.value)}
                placeholder="Add reminders or session prep notes…"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <p className="mt-1 text-xs text-slate-500">
                Private reminder for you only — click Save note below. Not shared with students.
              </p>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="mt-2 w-full rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
