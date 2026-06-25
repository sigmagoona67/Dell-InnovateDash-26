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
import { formatAppDate } from '../../lib/locale'
import {
  buildActiveRequestMap,
  cancelAcceptedConsultation,
  consultationSlotKey,
  createConsultationRequest,
  getConsultationRequestsForYouth,
  getMarkedDaysFromRequests,
  getMarkedDaysFromSlots,
  getRequestStatusLabel,
  getWorkerScheduleForMonth,
  getYouthFreeSlotsForMonth,
  isVisibleConsultationRequest,
  mergeStaffDaySlots,
  mergeYouthFreeDaySlots,
  normalizeSlotDate,
  respondToConsultationRequest,
  SCHEDULE_TABLES_MISSING_MESSAGE,
  toggleYouthFreeSlot,
  withdrawConsultationRequest,
} from '../../services/scheduleService'

const TABS = [
  { id: 'book', label: 'Book meeting' },
  { id: 'availability', label: 'My availability' },
  { id: 'consultations', label: 'Consultations' },
]

function statusBadgeClass(status) {
  if (status === 'pending') return 'bg-amber-100 text-amber-800'
  if (status === 'accepted') return 'bg-emerald-100 text-emerald-800'
  return 'bg-rose-100 text-rose-800'
}

function ScheduleTabBar({ activeTab, onChange, pendingCount }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
      {TABS.map((tab) => {
        const active = activeTab === tab.id
        const showBadge = tab.id === 'consultations' && pendingCount > 0
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              active ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {showBadge && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function WorkerSlotList({ slots, activeBySlot, onRequest, onWithdraw, busyHour }) {
  const visibleSlots = slots.filter((slot) => slot.status !== 'blocked')

  if (!visibleSlots.length) {
    return <p className="text-sm text-slate-500">No open slots on this day.</p>
  }

  return (
    <ul className="space-y-2">
      {visibleSlots.map((slot) => {
        const key = consultationSlotKey(slot.slotDate, slot.startTime)
        const activeRequest = activeBySlot.get(key)
        const isYouthPending =
          activeRequest?.status === 'pending' && activeRequest?.initiated_by !== 'staff'
        const isAccepted = activeRequest?.status === 'accepted'
        const isBooked = slot.status === 'booked' || isAccepted
        const isBusy = busyHour === slot.startHour

        let actionLabel = 'Request'
        let rowClass = 'border-emerald-100 bg-emerald-50/80 hover:bg-emerald-50'
        let badgeClass = 'bg-emerald-600 text-white'

        if (isBooked) {
          actionLabel = 'Booked'
          rowClass = 'border-sky-100 bg-sky-50'
          badgeClass = 'bg-sky-100 text-sky-800'
        } else if (isYouthPending) {
          actionLabel = 'Withdraw'
          rowClass = 'border-amber-100 bg-amber-50 hover:bg-amber-100/80'
          badgeClass = 'bg-amber-100 text-amber-800'
        }

        return (
          <li key={slot.startHour}>
            <button
              type="button"
              disabled={isBusy || isBooked}
              onClick={() => {
                if (isYouthPending) onWithdraw(activeRequest.id)
                else if (!isBooked) onRequest(slot)
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${rowClass} ${
                isBusy ? 'opacity-60' : ''
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">{slot.label}</span>
              <span className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                {actionLabel}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MyFreeSlotList({ slots, busyHour, onToggle }) {
  return (
    <ul className="space-y-2">
      {slots.map((slot) => {
        const isBusy = busyHour === slot.startHour
        const isFree = slot.isFree
        return (
          <li key={slot.startHour}>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onToggle(slot)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                isFree
                  ? 'border-teal-200 bg-teal-50 hover:bg-teal-100/80'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              } ${isBusy ? 'opacity-60' : ''}`}
            >
              <span className="text-sm font-semibold text-slate-800">{slot.label}</span>
              <span
                className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold ${
                  isFree ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isFree ? 'Free' : 'Mark free'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default function YouthSchedulePanel({ youthId, staffId, workerName }) {
  const window = useMemo(() => getCalendarWindow(), [])
  const initial = useMemo(() => getInitialCalendarMonth(), [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [activeTab, setActiveTab] = useState('book')
  const [workerSchedule, setWorkerSchedule] = useState({ slots: [], notes: [] })
  const [freeSlots, setFreeSlots] = useState([])
  const [requests, setRequests] = useState([])
  const [requestMessage, setRequestMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [busyHour, setBusyHour] = useState(null)
  const [actingId, setActingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const selectedDateKey = formatDateKey(year, month, selectedDay)
  const hasWorker = Boolean(staffId)
  const visibleRequests = useMemo(() => requests.filter(isVisibleConsultationRequest), [requests])
  const activeBySlot = useMemo(() => buildActiveRequestMap(requests), [requests])
  const pendingStaffRequests = visibleRequests.filter(
    (r) => r.status === 'pending' && r.initiated_by === 'staff',
  ).length

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
    const freeDays = freeSlots
      .map((slot) => Number(normalizeSlotDate(slot.slot_date).split('-')[2]))
      .filter((day) => Number.isFinite(day))
    const requestDays = getMarkedDaysFromRequests(visibleRequests)
    return [...new Set([...workerDays, ...freeDays, ...requestDays])]
  }, [workerSchedule.slots, freeSlots, visibleRequests])

  const selectedDateLabel = formatAppDate(selectedDateKey, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!youthId) {
        setErrorMessage('Youth profile is not ready yet. Please refresh and try again.')
        setInitialLoading(false)
        return
      }
      if (!silent) setInitialLoading(true)
      setErrorMessage('')
      try {
        const [workerData, youthFreeData, youthRequests] = await Promise.all([
          hasWorker
            ? getWorkerScheduleForMonth(staffId, year, month)
            : Promise.resolve({ slots: [], notes: [], tablesReady: true }),
          getYouthFreeSlotsForMonth(youthId, year, month),
          getConsultationRequestsForYouth(youthId),
        ])
        setWorkerSchedule(workerData)
        setFreeSlots(youthFreeData.slots)
        setRequests(youthRequests)
        if (!youthFreeData.tablesReady || (hasWorker && workerData.tablesReady === false)) {
          setErrorMessage(SCHEDULE_TABLES_MISSING_MESSAGE)
        }
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load schedule.')
      } finally {
        if (!silent) setInitialLoading(false)
      }
    },
    [hasWorker, staffId, youthId, year, month],
  )

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
    setBusyHour(slot.startHour)
    setNotice('')
    setErrorMessage('')
    try {
      const created = await createConsultationRequest({
        youthId,
        staffId,
        slotDate: selectedDateKey,
        startHour: slot.startHour,
        message: requestMessage,
      })
      setRequests((prev) => [created, ...prev])
      setNotice(`Consultation request sent for ${slot.label}.`)
      setRequestMessage('')
    } catch (error) {
      const message = error.message || 'Unable to send consultation request.'
      if (/already a pending request/i.test(message)) {
        await loadData({ silent: true })
      }
      setErrorMessage(message)
    } finally {
      setBusyHour(null)
    }
  }

  async function handleWithdraw(requestId) {
    setActingId(requestId)
    setNotice('')
    setErrorMessage('')
    try {
      await withdrawConsultationRequest(requestId)
      setRequests((prev) => prev.filter((item) => item.id !== requestId))
      setNotice('Request withdrawn.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to withdraw request.')
    } finally {
      setActingId('')
      setBusyHour(null)
    }
  }

  async function handleRespond(requestId, accept) {
    setActingId(requestId)
    setNotice('')
    setErrorMessage('')
    try {
      const updated = await respondToConsultationRequest(requestId, accept)
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setNotice(accept ? 'Meeting accepted. Both schedules updated.' : 'Meeting request declined.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to respond to meeting request.')
    } finally {
      await loadData({ silent: true })
      setActingId('')
    }
  }

  async function handleCancelMeeting(requestId) {
    setActingId(requestId)
    setNotice('')
    setErrorMessage('')
    try {
      await cancelAcceptedConsultation(requestId)
      setRequests((prev) => prev.filter((item) => item.id !== requestId))
      setNotice('Meeting cancelled.')
      await loadData({ silent: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to cancel meeting.')
    } finally {
      setActingId('')
    }
  }

  async function handleToggleFreeSlot(slot) {
    setBusyHour(slot.startHour)
    setNotice('')
    setErrorMessage('')
    try {
      const added = await toggleYouthFreeSlot(youthId, selectedDateKey, slot.startHour)
      setFreeSlots((prev) => {
        const startTime = `${String(slot.startHour).padStart(2, '0')}:00:00`
        if (added) {
          return [
            ...prev,
            {
              youth_id: youthId,
              slot_date: selectedDateKey,
              start_time: startTime,
              end_time: `${String(slot.startHour + 1).padStart(2, '0')}:00:00`,
            },
          ]
        }
        return prev.filter(
          (item) => !(item.slot_date === selectedDateKey && item.start_time.startsWith(startTime.slice(0, 5))),
        )
      })
      setNotice(added ? `Marked ${slot.label} as free.` : `Removed ${slot.label} from your free timings.`)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update free timing.')
      await loadData({ silent: true })
    } finally {
      setBusyHour(null)
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
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
          <p className="mt-1 text-sm text-slate-600">
            Book time with {workerName} · {getWindowLabel(window)}
          </p>
        </div>
      </header>

      {errorMessage && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      {notice && (
        <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>
      )}

      {initialLoading ? (
        <p className="text-slate-500">Loading schedule…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[17rem,1fr] lg:items-start">
          <div className="space-y-3 lg:sticky lg:top-6">
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
              compact
            />
            <p className="text-center text-xs text-slate-500">Dots mark activity on that day</p>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Selected day</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{selectedDateLabel}</p>
            </div>

            <ScheduleTabBar
              activeTab={activeTab}
              onChange={setActiveTab}
              pendingCount={pendingStaffRequests}
            />

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              {activeTab === 'book' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">{workerName}&rsquo;s open slots</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tap Request on a time that works for you.
                    </p>
                  </div>
                  <WorkerSlotList
                    slots={workerDaySlots}
                    activeBySlot={activeBySlot}
                    onRequest={handleRequestConsultation}
                    onWithdraw={handleWithdraw}
                    busyHour={busyHour}
                  />
                  <div className="border-t border-slate-100 pt-4">
                    <label htmlFor="consultation-message" className="mb-1 block text-sm font-semibold text-slate-800">
                      Optional message
                    </label>
                    <textarea
                      id="consultation-message"
                      rows={2}
                      value={requestMessage}
                      onChange={(event) => setRequestMessage(event.target.value)}
                      placeholder="Share what you would like to discuss…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'availability' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">My free timings</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Let {workerName} know when you are available on this day.
                    </p>
                  </div>
                  <MyFreeSlotList
                    slots={myFreeDaySlots}
                    busyHour={busyHour}
                    onToggle={handleToggleFreeSlot}
                  />
                </div>
              )}

              {activeTab === 'consultations' && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-800">Consultations</h2>
                  {visibleRequests.length ? (
                    <ul className="space-y-2">
                      {visibleRequests.map((request) => {
                        const isStaffRequest = request.initiated_by === 'staff'
                        const isPending = request.status === 'pending'
                        const isAccepted = request.status === 'accepted'

                        return (
                          <li
                            key={request.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                  {isStaffRequest ? 'Worker requested' : 'You requested'}
                                </p>
                                <span className="font-semibold text-slate-800">
                                  {formatAppDate(request.slot_date, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}{' '}
                                  · {request.start_time.slice(0, 5)} – {request.end_time.slice(0, 5)}
                                </span>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(request.status)}`}
                              >
                                {getRequestStatusLabel(request)}
                              </span>
                            </div>

                            {request.message && (
                              <p className="mt-2 text-slate-600">&ldquo;{request.message}&rdquo;</p>
                            )}

                            {isPending && isStaffRequest && (
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  disabled={actingId === request.id}
                                  onClick={() => handleRespond(request.id, true)}
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  disabled={actingId === request.id}
                                  onClick={() => handleRespond(request.id, false)}
                                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                >
                                  Decline
                                </button>
                              </div>
                            )}

                            {isPending && !isStaffRequest && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  disabled={actingId === request.id}
                                  onClick={() => handleWithdraw(request.id)}
                                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                >
                                  Withdraw request
                                </button>
                              </div>
                            )}

                            {isAccepted && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  disabled={actingId === request.id}
                                  onClick={() => handleCancelMeeting(request.id)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  Cancel meeting
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No consultations yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
