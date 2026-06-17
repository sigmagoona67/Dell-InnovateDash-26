import { useCallback, useEffect, useMemo, useState } from 'react'
import MonthCalendar from './MonthCalendar'
import {
  canNavigateMonth,
  formatDateKey,
  getCalendarWindow,
  getInitialCalendarMonth,
  getWindowLabel,
  shiftMonth,
} from '../../lib/calendarRange'
import {
  createConsultationRequest,
  getConsultationRequestsForYouth,
  getMarkedDaysFromRequests,
  getMarkedDaysFromSlots,
  getWorkerScheduleForMonth,
  getYouthFreeSlotsForMonth,
  mergeStaffDaySlots,
  mergeYouthFreeDaySlots,
  toggleYouthFreeSlot,
} from '../../services/scheduleService'

function WorkerSlotList({ slots, onRequest, requestingHour, pendingRequests }) {
  const pendingKeys = new Set(
    pendingRequests
      .filter((request) => request.status === 'pending')
      .map((request) => `${request.slot_date}|${request.start_time.slice(0, 5)}`),
  )

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const key = `${slot.slotDate}|${slot.startTime.slice(0, 5)}`
        const isPending = pendingKeys.has(key)
        const isBooked = slot.status === 'booked'
        const isBlocked = slot.status === 'blocked'
        const canRequest = slot.status === 'available' && !isPending

        return (
          <button
            key={slot.startHour}
            type="button"
            disabled={!canRequest || requestingHour === slot.startHour}
            onClick={() => onRequest(slot)}
            className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
              isBooked
                ? 'border-sky-200 bg-sky-100 text-sky-800'
                : isBlocked
                  ? 'border-slate-200 bg-slate-100 text-slate-400'
                  : isPending
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span className="block">{slot.label}</span>
            <span className="mt-0.5 block text-xs font-medium opacity-80">
              {isBooked ? 'Booked' : isBlocked ? 'Unavailable' : isPending ? 'Requested' : 'Request'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function YouthSchedulePanel({ youthId, staffId, workerName }) {
  const window = useMemo(() => getCalendarWindow(), [])
  const initial = useMemo(() => getInitialCalendarMonth(), [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [workerSchedule, setWorkerSchedule] = useState({ slots: [], notes: [] })
  const [freeSlots, setFreeSlots] = useState([])
  const [requests, setRequests] = useState([])
  const [requestMessage, setRequestMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestingHour, setRequestingHour] = useState(null)
  const [togglingHour, setTogglingHour] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const selectedDateKey = formatDateKey(year, month, selectedDay)
  const hasWorker = Boolean(staffId)

  const workerDaySlots = useMemo(() => {
    return mergeStaffDaySlots(selectedDateKey, workerSchedule.slots).map((slot) => ({
      ...slot,
      slotDate: selectedDateKey,
    }))
  }, [selectedDateKey, workerSchedule.slots])

  const myFreeDaySlots = useMemo(
    () => mergeYouthFreeDaySlots(selectedDateKey, freeSlots),
    [selectedDateKey, freeSlots],
  )

  const markedDays = useMemo(() => {
    const workerDays = getMarkedDaysFromSlots(workerSchedule.slots)
    const freeDays = freeSlots.map((slot) => Number(slot.slot_date.split('-')[2]))
    const requestDays = getMarkedDaysFromRequests(requests)
    return [...new Set([...workerDays, ...freeDays, ...requestDays])]
  }, [workerSchedule.slots, freeSlots, requests])

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [workerData, youthFree, youthRequests] = await Promise.all([
        hasWorker ? getWorkerScheduleForMonth(staffId, year, month) : Promise.resolve({ slots: [], notes: [] }),
        getYouthFreeSlotsForMonth(youthId, year, month),
        getConsultationRequestsForYouth(youthId),
      ])
      setWorkerSchedule(workerData)
      setFreeSlots(youthFree)
      setRequests(youthRequests)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load schedule.')
    } finally {
      setLoading(false)
    }
  }, [hasWorker, staffId, youthId, year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  async function handleRequestConsultation(slot) {
    if (!hasWorker) return
    setRequestingHour(slot.startHour)
    setNotice('')
    setErrorMessage('')
    try {
      await createConsultationRequest({
        youthId,
        staffId,
        slotDate: selectedDateKey,
        startHour: slot.startHour,
        message: requestMessage,
      })
      setNotice(`Consultation request sent for ${slot.label}.`)
      setRequestMessage('')
      await loadData()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to send consultation request.')
    } finally {
      setRequestingHour(null)
    }
  }

  async function handleToggleFreeSlot(slot) {
    setTogglingHour(slot.startHour)
    setNotice('')
    setErrorMessage('')
    try {
      const added = await toggleYouthFreeSlot(youthId, selectedDateKey, slot.startHour)
      setNotice(added ? `Marked ${slot.label} as free.` : `Removed ${slot.label} from your free timings.`)
      await loadData()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update free timing.')
    } finally {
      setTogglingHour(null)
    }
  }

  if (!hasWorker) {
    return (
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
          <p className="mt-2 text-slate-600">
            Once a youth worker is assigned, you can view their availability and request consultations here.
          </p>
        </header>
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Worker assignment is still pending.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
        <p className="mt-2 text-slate-600">
          View {workerName}&rsquo;s availability, mark your free timings, and request consultations.
        </p>
        <p className="mt-1 text-xs text-slate-500">Calendar window: {getWindowLabel(window)}</p>
      </header>

      {errorMessage && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      {notice && (
        <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">{notice}</p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading schedule…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[20rem,1fr]">
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
            legend="Dots mark worker availability, your free timings, or consultation requests."
          />

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">{workerName}&rsquo;s schedule</h2>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(selectedDateKey).toLocaleDateString('en-SG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <div className="mt-4">
                <WorkerSlotList
                  slots={workerDaySlots}
                  onRequest={handleRequestConsultation}
                  requestingHour={requestingHour}
                  pendingRequests={requests}
                />
              </div>
              <div className="mt-4">
                <label htmlFor="consultation-message" className="mb-1 block text-sm font-semibold text-slate-800">
                  Optional message for your worker
                </label>
                <textarea
                  id="consultation-message"
                  rows={2}
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  placeholder="Share what you would like to discuss…"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">My free timings</h2>
              <p className="mt-1 text-sm text-slate-500">Tap a slot to mark when you are available.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {myFreeDaySlots.map((slot) => (
                  <button
                    key={slot.startHour}
                    type="button"
                    disabled={togglingHour === slot.startHour}
                    onClick={() => handleToggleFreeSlot(slot)}
                    className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                      slot.isFree
                        ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block">{slot.label}</span>
                    <span className="mt-0.5 block text-xs font-medium opacity-80">
                      {slot.isFree ? 'Free' : 'Tap to mark free'}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">My consultation requests</h2>
              {requests.length ? (
                <ul className="mt-3 space-y-2">
                  {requests.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {new Date(request.slot_date).toLocaleDateString('en-SG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          · {request.start_time.slice(0, 5)} – {request.end_time.slice(0, 5)}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            request.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : request.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                      {request.message && <p className="mt-2 text-slate-600">&ldquo;{request.message}&rdquo;</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No consultation requests yet.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
