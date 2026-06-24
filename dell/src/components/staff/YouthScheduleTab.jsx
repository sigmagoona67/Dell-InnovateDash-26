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
import { formatHourLabel } from '../../lib/scheduleSlots'
import {
  buildActiveRequestMap,
  cancelAcceptedConsultation,
  consultationSlotKey,
  createStaffMeetingRequest,
  getConsultationRequestsForStaff,
  getMarkedDaysFromRequests,
  getRequestStatusLabel,
  getYouthFreeSlotsForMonth,
  isVisibleConsultationRequest,
  mergeYouthFreeDaySlots,
  respondToConsultationRequest,
  SCHEDULE_TABLES_MISSING_MESSAGE,
  withdrawConsultationRequest,
} from '../../services/scheduleService'

const TABS = [
  { id: 'free', label: 'Free timings' },
  { id: 'consultations', label: 'Consultation requests' },
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

function RequestCard({
  request,
  onRespond,
  onWithdraw,
  onCancelMeeting,
  actingId,
}) {
  const startHour = Number(String(request.start_time).slice(0, 2))
  const endHour = Number(String(request.end_time).slice(0, 2))
  const isYouthRequest = request.initiated_by !== 'staff'
  const isPending = request.status === 'pending'
  const isAccepted = request.status === 'accepted'
  const isActing = actingId === request.id

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {isYouthRequest ? 'Student requested' : 'You requested'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatAppDate(request.slot_date, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatHourLabel(startHour)} – {formatHourLabel(endHour)}
          </p>
          {request.message && (
            <p className="mt-2 text-sm text-slate-600">&ldquo;{request.message}&rdquo;</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(request.status)}`}>
          {getRequestStatusLabel(request)}
        </span>
      </div>

      {isPending && isYouthRequest && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={isActing}
            onClick={() => onRespond(request.id, true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={isActing}
            onClick={() => onRespond(request.id, false)}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      )}

      {isPending && !isYouthRequest && (
        <div className="mt-3 flex items-center gap-2">
          <p className="text-sm text-slate-600">Waiting for student to respond.</p>
          <button
            type="button"
            disabled={isActing}
            onClick={() => onWithdraw(request.id)}
            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Withdraw
          </button>
        </div>
      )}

      {isAccepted && (
        <div className="mt-3">
          <button
            type="button"
            disabled={isActing}
            onClick={() => onCancelMeeting(request.id)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel meeting
          </button>
        </div>
      )}
    </div>
  )
}

function FreeSlotActions({ slot, activeRequest, onRequest, onWithdraw, busyHour }) {
  const isPendingStaff =
    activeRequest?.status === 'pending' && activeRequest?.initiated_by === 'staff'
  const isPendingYouth =
    activeRequest?.status === 'pending' && activeRequest?.initiated_by === 'youth'
  const isAccepted = activeRequest?.status === 'accepted'
  const isBusy = busyHour === slot.startHour

  if (isAccepted) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
        <span className="text-sm font-semibold text-sky-900">{slot.label}</span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Meeting confirmed
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
      <span className="text-sm font-semibold text-emerald-800">{slot.label}</span>
      {isPendingStaff ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-800">Requested</span>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onWithdraw(activeRequest.id)}
            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Withdraw
          </button>
        </div>
      ) : isPendingYouth ? (
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          Student requested
        </span>
      ) : (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onRequest(slot)}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          Request meeting
        </button>
      )}
    </div>
  )
}

export default function YouthScheduleTab({ detail, staffId, onUpdated }) {
  const youthId = detail?.youth?.id
  const isUnassigned = Boolean(detail?.isPending || detail?.youth?.assigned_staff_id == null)
  const window = useMemo(() => getCalendarWindow(), [])
  const initial = useMemo(() => getInitialCalendarMonth(), [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [activeTab, setActiveTab] = useState('free')
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
  const activeBySlot = useMemo(() => buildActiveRequestMap(requests), [requests])
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
  const selectedDateLabel = formatAppDate(selectedDateKey, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (isUnassigned) {
        setLoading(false)
        return
      }
      if (!youthId || !staffId) {
        setErrorMessage('Schedule is unavailable until this youth profile is fully loaded.')
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      setErrorMessage('')
      try {
        const [freeData, consultationRequests] = await Promise.all([
          getYouthFreeSlotsForMonth(youthId, year, month),
          getConsultationRequestsForStaff(staffId, { youthId }),
        ])
        setFreeSlots(freeData.slots)
        setRequests(consultationRequests)
        if (!freeData.tablesReady) {
          setErrorMessage(SCHEDULE_TABLES_MISSING_MESSAGE)
        }
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load student schedule.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [isUnassigned, youthId, staffId, year, month],
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
      await loadData({ silent: true })
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
      await loadData({ silent: true })
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

  if (isUnassigned) {
    return (
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
          <p className="mt-2 text-slate-600">
            Once you assign this student, you can request meetings during their free timings and respond to
            consultation requests here.
          </p>
        </header>
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Student assignment is still pending.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{detail.name}&rsquo;s Schedule</h1>
          <p className="mt-1 text-sm text-slate-600">
            Request meetings during free timings and respond to student consultation requests.
          </p>
          <p className="mt-1 text-xs text-slate-500">Calendar window: {getWindowLabel(window)}</p>
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

      {loading ? (
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
            <p className="text-center text-xs text-slate-500">
              Dots mark free timings or consultation activity.
            </p>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Selected day</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{selectedDateLabel}</p>
            </div>

            <ScheduleTabBar
              activeTab={activeTab}
              onChange={setActiveTab}
              pendingCount={pendingYouthRequests.length}
            />

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              {activeTab === 'free' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Free timings on selected day</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Request a meeting when the student marked themselves as free.
                    </p>
                  </div>
                  {dayFreeSlots.length ? (
                    <div className="space-y-2">
                      {dayFreeSlots.map((slot) => {
                        const key = consultationSlotKey(selectedDateKey, slot.startTime)
                        return (
                          <FreeSlotActions
                            key={slot.startHour}
                            slot={slot}
                            activeRequest={activeBySlot.get(key)}
                            onRequest={handleRequestMeeting}
                            onWithdraw={handleWithdraw}
                            busyHour={busyHour}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No free timings recorded for this date.</p>
                  )}
                  <div className="border-t border-slate-100 pt-4">
                    <label htmlFor="staff-meeting-message" className="mb-1 block text-sm font-semibold text-slate-800">
                      Optional message for the student
                    </label>
                    <textarea
                      id="staff-meeting-message"
                      rows={2}
                      value={meetingMessage}
                      onChange={(event) => setMeetingMessage(event.target.value)}
                      placeholder="Share the purpose of this meeting…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Included when you tap Request meeting on a free slot above. Student free timings appear here after they mark them on their Schedule page.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'consultations' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-slate-800">Consultation requests</h2>
                    {pendingYouthRequests.length > 0 && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
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
                    <p className="text-sm text-slate-500">No consultation activity yet.</p>
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
