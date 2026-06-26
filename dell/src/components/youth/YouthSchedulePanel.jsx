import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import MonthCalendar from './MonthCalendar'
import { Button, Card, Textarea } from '../ui'
import {
  canNavigateMonth,
  formatDateKey,
  getCalendarWindow,
  getInitialCalendarMonth,
  getWindowLabel,
  shiftMonth,
} from '../../lib/calendarRange'
import {
  buildPendingRequestMap,
  cancelAcceptedConsultation,
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
  respondToConsultationRequest,
  toggleYouthFreeSlot,
  withdrawConsultationRequest,
} from '../../services/scheduleService'

const STATUS_PILL = {
  pending: 'bg-warning-100 text-warning-500',
  accepted: 'bg-success-100 text-success-600',
  withdrawn: 'bg-danger-100 text-danger-700',
  rejected: 'bg-danger-100 text-danger-700',
}

function StatusPill({ request }) {
  const tone = STATUS_PILL[request.status] || 'bg-slate-100 text-slate-600'
  return (
    <span className={`rounded-pill px-3 py-1 text-[12px] font-semibold capitalize ${tone}`}>
      {getRequestStatusLabel(request)}
    </span>
  )
}

function WorkerSlotList({ slots, pendingBySlot, onRequest, onWithdraw, busyHour }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const key = `${slot.slotDate}|${slot.startTime.slice(0, 5)}`
        const pendingRequest = pendingBySlot.get(key)
        const isYouthPending =
          pendingRequest?.status === 'pending' && pendingRequest?.initiated_by !== 'staff'
        const isBooked = slot.status === 'booked'
        const isBlocked = slot.status === 'blocked'
        const isBusy = busyHour === slot.startHour

        const tone = isBooked
          ? 'border-sky-200 bg-sky-50 text-sky-700'
          : isBlocked
            ? 'border-slate-200 bg-slate-100 text-slate-400'
            : isYouthPending
              ? 'border-warning-100 bg-warning-100/60 text-warning-500 hover:bg-warning-100'
              : 'border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100'

        return (
          <button
            key={slot.startHour}
            type="button"
            disabled={isBusy || isBooked || isBlocked}
            onClick={() => {
              if (isYouthPending) onWithdraw(pendingRequest.id)
              else onRequest(slot)
            }}
            className={`rounded-control border px-3 py-2 text-left text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${tone} ${isBusy ? 'opacity-60' : ''}`}
          >
            <span className="block">{slot.label}</span>
            <span className="mt-0.5 block text-[12px] font-medium opacity-80">
              {isBooked
                ? 'Booked'
                : isBlocked
                  ? 'Unavailable'
                  : isYouthPending
                    ? 'Tap to withdraw'
                    : 'Request'}
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
  const [initialLoading, setInitialLoading] = useState(true)
  const [busyHour, setBusyHour] = useState(null)
  const [actingId, setActingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const selectedDateKey = formatDateKey(year, month, selectedDay)
  const hasWorker = Boolean(staffId)
  const visibleRequests = useMemo(() => requests.filter(isVisibleConsultationRequest), [requests])
  const pendingBySlot = useMemo(() => buildPendingRequestMap(requests), [requests])

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
    const requestDays = getMarkedDaysFromRequests(visibleRequests)
    return [...new Set([...workerDays, ...freeDays, ...requestDays])]
  }, [workerSchedule.slots, freeSlots, visibleRequests])

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
        const [workerData, youthFree, youthRequests] = await Promise.all([
          hasWorker
            ? getWorkerScheduleForMonth(staffId, year, month)
            : Promise.resolve({ slots: [], notes: [] }),
          getYouthFreeSlotsForMonth(youthId, year, month),
          getConsultationRequestsForYouth(youthId),
        ])
        setWorkerSchedule(workerData)
        setFreeSlots(youthFree)
        setRequests(youthRequests)
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
      setErrorMessage(error.message || 'Unable to send consultation request.')
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
      await loadData({ silent: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to respond to meeting request.')
    } finally {
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
          (item) =>
            !(item.slot_date === selectedDateKey && item.start_time.startsWith(startTime.slice(0, 5))),
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

  const selectedDateLabel = new Date(selectedDateKey).toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (!hasWorker) {
    return (
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <p className="text-[12px] font-medium uppercase tracking-wide text-teal-600">Youth Portal</p>
          <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">Schedule</h1>
          <p className="mt-2 text-[15px] text-slate-600">
            Once a youth worker is assigned, you can view their availability and request consultations here.
          </p>
        </header>
        <Card padding="lg" className="text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-teal-500" aria-hidden="true" />
          <p className="mt-3 text-[15px] text-slate-600">Worker assignment is still pending.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[12px] font-medium uppercase tracking-wide text-teal-600">Youth Portal</p>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">Schedule</h1>
        <p className="mt-2 text-[15px] text-slate-600">
          View {workerName}&rsquo;s availability, mark your free timings, and manage consultations.
        </p>
        <p className="mt-1 text-[12px] text-slate-500">Calendar window: {getWindowLabel(window)}</p>
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-card border border-danger-100 bg-danger-100/50 px-4 py-3 text-[13px] text-danger-700"
        >
          {errorMessage}
        </p>
      )}

      {notice && (
        <p className="rounded-card border border-teal-100 bg-teal-50 px-4 py-3 text-[13px] text-teal-700">
          {notice}
        </p>
      )}

      {initialLoading ? (
        <p className="text-[15px] text-slate-500">Loading schedule…</p>
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
            accent="teal"
            legend="Dots mark worker availability, your free timings, or consultations."
          />

          <div className="space-y-6">
            <Card as="section" padding="md">
              <h2 className="font-display text-[18px] font-semibold text-ink-800">
                {workerName}&rsquo;s schedule
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">{selectedDateLabel}</p>
              <div className="mt-4">
                <WorkerSlotList
                  slots={workerDaySlots}
                  pendingBySlot={pendingBySlot}
                  onRequest={handleRequestConsultation}
                  onWithdraw={handleWithdraw}
                  busyHour={busyHour}
                />
              </div>
              <div className="mt-4">
                <Textarea
                  accent="teal"
                  label="Optional message for your worker"
                  rows={2}
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  placeholder="Share what you would like to discuss…"
                />
              </div>
            </Card>

            <Card as="section" padding="md">
              <h2 className="font-display text-[18px] font-semibold text-ink-800">My free timings</h2>
              <p className="mt-1 text-[13px] text-slate-500">Tap a slot to mark when you are available.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {myFreeDaySlots.map((slot) => (
                  <button
                    key={slot.startHour}
                    type="button"
                    disabled={busyHour === slot.startHour}
                    onClick={() => handleToggleFreeSlot(slot)}
                    className={`rounded-control border px-3 py-2 text-left text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                      slot.isFree
                        ? 'border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    } disabled:opacity-60`}
                  >
                    <span className="block">{slot.label}</span>
                    <span className="mt-0.5 block text-[12px] font-medium opacity-80">
                      {slot.isFree ? 'Free' : 'Tap to mark free'}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card as="section" padding="md">
              <h2 className="font-display text-[18px] font-semibold text-ink-800">Consultations</h2>
              {visibleRequests.length ? (
                <ul className="mt-3 space-y-2">
                  {visibleRequests.map((request) => {
                    const isStaffRequest = request.initiated_by === 'staff'
                    const isPending = request.status === 'pending'
                    const isAccepted = request.status === 'accepted'

                    return (
                      <li
                        key={request.id}
                        className="rounded-card border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-600"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
                              {isStaffRequest ? 'Worker requested' : 'You requested'}
                            </p>
                            <span className="font-semibold text-ink-800">
                              {new Date(request.slot_date).toLocaleDateString('en-SG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              · {request.start_time.slice(0, 5)} – {request.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <StatusPill request={request} />
                        </div>

                        {request.message && (
                          <p className="mt-2 text-slate-600">&ldquo;{request.message}&rdquo;</p>
                        )}

                        {isPending && isStaffRequest && (
                          <div className="mt-3 flex gap-2">
                            <Button
                              accent="teal"
                              size="sm"
                              disabled={actingId === request.id}
                              onClick={() => handleRespond(request.id, true)}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="secondary"
                              accent="teal"
                              size="sm"
                              disabled={actingId === request.id}
                              onClick={() => handleRespond(request.id, false)}
                            >
                              Decline
                            </Button>
                          </div>
                        )}

                        {isPending && !isStaffRequest && (
                          <div className="mt-3">
                            <Button
                              variant="ghost"
                              accent="teal"
                              size="sm"
                              disabled={actingId === request.id}
                              onClick={() => handleWithdraw(request.id)}
                            >
                              Withdraw request
                            </Button>
                          </div>
                        )}

                        {isAccepted && (
                          <div className="mt-3">
                            <Button
                              variant="ghost"
                              accent="teal"
                              size="sm"
                              disabled={actingId === request.id}
                              onClick={() => handleCancelMeeting(request.id)}
                            >
                              Cancel meeting
                            </Button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] text-slate-500">No consultations yet.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
