import { useCallback, useEffect, useMemo, useState } from 'react'
import MonthCalendar from '../youth/MonthCalendar'
import { Button, Card, Textarea } from '../ui'
import {
  canNavigateMonth,
  formatDateKey,
  getCalendarWindow,
  getInitialCalendarMonth,
  getWindowLabel,
  shiftMonth,
} from '../../lib/calendarRange'
import { formatHourLabel } from '../../lib/scheduleSlots'
import {
  buildPendingRequestMap,
  cancelAcceptedConsultation,
  createStaffMeetingRequest,
  getConsultationRequestsForStaff,
  getMarkedDaysFromRequests,
  getRequestStatusLabel,
  getYouthFreeSlotsForMonth,
  isVisibleConsultationRequest,
  mergeYouthFreeDaySlots,
  respondToConsultationRequest,
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

function RequestCard({ request, onRespond, onWithdraw, onCancelMeeting, actingId }) {
  const startHour = Number(String(request.start_time).slice(0, 2))
  const endHour = Number(String(request.end_time).slice(0, 2))
  const isYouthRequest = request.initiated_by !== 'staff'
  const isPending = request.status === 'pending'
  const isAccepted = request.status === 'accepted'
  const isActing = actingId === request.id

  return (
    <div className="rounded-card border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
            {isYouthRequest ? 'Student requested' : 'You requested'}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-ink-800">
            {new Date(request.slot_date).toLocaleDateString('en-SG', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="mt-1 text-[13px] text-slate-600">
            {formatHourLabel(startHour)} – {formatHourLabel(endHour)}
          </p>
          {request.message && (
            <p className="mt-2 text-[13px] text-slate-600">&ldquo;{request.message}&rdquo;</p>
          )}
        </div>
        <StatusPill request={request} />
      </div>

      {isPending && isYouthRequest && (
        <div className="mt-3 flex gap-2">
          <Button accent="sky" size="sm" disabled={isActing} onClick={() => onRespond(request.id, true)}>
            Accept
          </Button>
          <Button
            variant="secondary"
            accent="sky"
            size="sm"
            disabled={isActing}
            onClick={() => onRespond(request.id, false)}
          >
            Reject
          </Button>
        </div>
      )}

      {isPending && !isYouthRequest && (
        <div className="mt-3 flex items-center gap-2">
          <p className="text-[13px] text-slate-600">Waiting for student to respond.</p>
          <Button
            variant="ghost"
            accent="sky"
            size="sm"
            disabled={isActing}
            onClick={() => onWithdraw(request.id)}
          >
            Withdraw
          </Button>
        </div>
      )}

      {isAccepted && (
        <div className="mt-3">
          <Button
            variant="secondary"
            accent="sky"
            size="sm"
            disabled={isActing}
            onClick={() => onCancelMeeting(request.id)}
          >
            Cancel meeting
          </Button>
        </div>
      )}
    </div>
  )
}

function FreeSlotActions({ slot, pendingRequest, onRequest, onWithdraw, busyHour }) {
  const isPendingStaff =
    pendingRequest?.status === 'pending' && pendingRequest?.initiated_by === 'staff'
  const isBusy = busyHour === slot.startHour

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-success-100 bg-success-100/40 px-4 py-3">
      <span className="text-[13px] font-semibold text-success-600">{slot.label}</span>
      {isPendingStaff ? (
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-warning-500">Requested</span>
          <Button
            variant="ghost"
            accent="sky"
            size="sm"
            disabled={isBusy}
            onClick={() => onWithdraw(pendingRequest.id)}
          >
            Withdraw
          </Button>
        </div>
      ) : (
        <Button accent="sky" size="sm" disabled={isBusy} onClick={() => onRequest(slot)}>
          Request meeting
        </Button>
      )}
    </div>
  )
}

export default function YouthScheduleTab({ youthId, youthName, staffId, onUpdated }) {
  const window = useMemo(() => getCalendarWindow(), [])
  const initial = useMemo(() => getInitialCalendarMonth(), [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [freeSlots, setFreeSlots] = useState([])
  const [requests, setRequests] = useState([])
  const [meetingMessage, setMeetingMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState('')
  const [busyHour, setBusyHour] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const selectedDateKey = formatDateKey(year, month, selectedDay)
  const visibleRequests = useMemo(() => requests.filter(isVisibleConsultationRequest), [requests])
  const pendingBySlot = useMemo(() => buildPendingRequestMap(requests), [requests])
  const dayFreeSlots = useMemo(
    () => mergeYouthFreeDaySlots(selectedDateKey, freeSlots).filter((slot) => slot.isFree),
    [selectedDateKey, freeSlots],
  )
  const markedDays = useMemo(
    () => [
      ...new Set([
        ...getMarkedDaysFromRequests(visibleRequests),
        ...freeSlots.map((s) => Number(s.slot_date.split('-')[2])),
      ]),
    ],
    [visibleRequests, freeSlots],
  )
  const pendingYouthRequests = visibleRequests.filter(
    (request) => request.status === 'pending' && request.initiated_by !== 'staff',
  )

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!youthId || !staffId) {
        setErrorMessage('Schedule is unavailable until this youth profile is fully loaded.')
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      setErrorMessage('')
      try {
        const [free, consultationRequests] = await Promise.all([
          getYouthFreeSlotsForMonth(youthId, year, month),
          getConsultationRequestsForStaff(staffId, { youthId }),
        ])
        setFreeSlots(free)
        setRequests(consultationRequests)
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load student schedule.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [youthId, staffId, year, month],
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

  async function handleRequestMeeting(slot) {
    setBusyHour(slot.startHour)
    setActingId('request')
    setNotice('')
    setErrorMessage('')
    try {
      const created = await createStaffMeetingRequest({
        youthId,
        staffId,
        slotDate: selectedDateKey,
        startHour: slot.startHour,
        message: meetingMessage,
      })
      setRequests((prev) => [...prev, created])
      setNotice(`Meeting request sent for ${slot.label}.`)
      setMeetingMessage('')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to request meeting.')
    } finally {
      setBusyHour(null)
      setActingId('')
    }
  }

  async function handleRespond(requestId, accept) {
    setActingId(requestId)
    setNotice('')
    setErrorMessage('')
    try {
      const updated = await respondToConsultationRequest(requestId, accept)
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setNotice(accept ? 'Consultation accepted. Both schedules updated.' : 'Consultation rejected.')
      onUpdated?.()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update consultation request.')
      await loadData({ silent: true })
    } finally {
      setActingId('')
    }
  }

  async function handleWithdraw(requestId) {
    setActingId(requestId)
    setNotice('')
    setErrorMessage('')
    try {
      const withdrawn = await withdrawConsultationRequest(requestId)
      setRequests((prev) => prev.filter((item) => item.id !== withdrawn.id))
      setNotice('Request withdrawn.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to withdraw request.')
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
      onUpdated?.()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to cancel meeting.')
      await loadData({ silent: true })
    } finally {
      setActingId('')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">Staff Portal</p>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">
          {youthName}&rsquo;s Schedule
        </h1>
        <p className="mt-2 text-[15px] text-slate-600">
          Request meetings during free timings and respond to student consultation requests.
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
        <p className="rounded-card border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] text-sky-600">
          {notice}
        </p>
      )}

      {loading ? (
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
            accent="sky"
            legend="Dots mark free timings or consultation activity."
          />

          <div className="space-y-6">
            <Card as="section" padding="md">
              <h2 className="font-display text-[18px] font-semibold text-ink-800">
                Free timings on selected day
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                Request a meeting when the student marked themselves as free.
              </p>
              {dayFreeSlots.length ? (
                <div className="mt-3 space-y-2">
                  {dayFreeSlots.map((slot) => {
                    const key = `${selectedDateKey}|${slot.startTime.slice(0, 5)}`
                    return (
                      <FreeSlotActions
                        key={slot.startHour}
                        slot={slot}
                        pendingRequest={pendingBySlot.get(key)}
                        onRequest={handleRequestMeeting}
                        onWithdraw={handleWithdraw}
                        busyHour={busyHour}
                      />
                    )
                  })}
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-slate-500">No free timings recorded for this date.</p>
              )}
              <div className="mt-4">
                <Textarea
                  accent="sky"
                  label="Optional message for the student"
                  rows={2}
                  value={meetingMessage}
                  onChange={(event) => setMeetingMessage(event.target.value)}
                  placeholder="Share the purpose of this meeting…"
                />
              </div>
            </Card>

            <Card as="section" padding="md">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-[18px] font-semibold text-ink-800">
                  Consultation requests
                </h2>
                {pendingYouthRequests.length > 0 && (
                  <span className="rounded-pill bg-warning-100 px-3 py-1 text-[12px] font-semibold text-warning-500">
                    {pendingYouthRequests.length} from student
                  </span>
                )}
              </div>

              {visibleRequests.length ? (
                <div className="space-y-3">
                  {visibleRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onRespond={handleRespond}
                      onWithdraw={handleWithdraw}
                      onCancelMeeting={handleCancelMeeting}
                      actingId={actingId}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-500">No consultation activity yet.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
