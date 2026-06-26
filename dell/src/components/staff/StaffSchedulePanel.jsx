import { useCallback, useEffect, useMemo, useState } from 'react'
import MonthCalendar from '../youth/MonthCalendar'
import { Button, Textarea } from '../ui'
import {
  canNavigateMonth,
  formatDateKey,
  getCalendarWindow,
  getInitialCalendarMonth,
  getWindowLabel,
  shiftMonth,
} from '../../lib/calendarRange'
import { hourToTime } from '../../lib/scheduleSlots'
import {
  getMarkedDaysFromNotes,
  getMarkedDaysFromSlots,
  getStaffScheduleForMonth,
  mergeStaffDaySlots,
  saveStaffDayNote,
  upsertStaffSlot,
} from '../../services/scheduleService'

const STATUS_CYCLE = {
  available: 'blocked',
  blocked: 'available',
  booked: 'booked',
}

const STATUS_STYLES = {
  available: 'border-success-100 bg-success-100/50 text-success-600 hover:bg-success-100',
  blocked: 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200',
  booked: 'border-sky-200 bg-sky-50 text-sky-700 cursor-default',
}

function SlotButton({ slot, onToggle, saving }) {
  const label =
    slot.status === 'available' ? 'Open' : slot.status === 'blocked' ? 'Blocked' : 'Booked'

  return (
    <button
      type="button"
      disabled={slot.status === 'booked' || saving}
      onClick={() => onToggle(slot)}
      className={`rounded-control border px-3 py-2 text-left text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${STATUS_STYLES[slot.status]}`}
    >
      <span className="block">{slot.label}</span>
      <span className="mt-0.5 block text-[12px] font-medium opacity-80">{label}</span>
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
          setErrorMessage('Schedule tables are not deployed yet. Run the schedule migration on InsForge.')
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
          (row) =>
            !(row.slot_date === selectedDateKey && row.start_time.startsWith(startTime.slice(0, 5))),
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

  const selectedDateLabel = new Date(selectedDateKey).toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <aside className="relative z-10 w-full border-b border-slate-200 bg-white p-4 lg:w-[22rem] lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6">
      <div className="mb-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">My Schedule</p>
        <h2 className="mt-1 font-display text-[18px] font-semibold text-ink-800">Availability</h2>
        <p className="mt-1 text-[12px] text-slate-500">Window: {getWindowLabel(window)}</p>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mb-3 rounded-card border border-danger-100 bg-danger-100/50 px-3 py-2 text-[12px] text-danger-700"
        >
          {errorMessage}
        </p>
      )}

      {notice && (
        <p className="mb-3 rounded-card border border-sky-100 bg-sky-50 px-3 py-2 text-[12px] text-sky-600">
          {notice}
        </p>
      )}

      {initialLoading ? (
        <p className="text-[13px] text-slate-500">Loading schedule…</p>
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
            accent="sky"
            legend="Tap a day to manage hourly slots. Dots mark days with bookings, blocks, or notes."
          />

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-800">{selectedDateLabel}</p>
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
              <p className="mt-2 text-[12px] text-slate-500">
                Tap open slots to block them. Booked slots are set when you accept a student consultation.
              </p>
            </div>

            <div>
              <Textarea
                accent="sky"
                label="Notes for this date"
                rows={3}
                value={dayNoteDraft}
                onChange={(event) => setDayNoteDraft(event.target.value)}
                placeholder="Add reminders or session prep notes…"
              />
              <Button
                accent="sky"
                size="sm"
                loading={savingNote}
                onClick={handleSaveNote}
                className="mt-2 w-full"
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </Button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
