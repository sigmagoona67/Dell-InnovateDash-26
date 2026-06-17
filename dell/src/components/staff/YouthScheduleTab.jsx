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
import { formatHourLabel } from '../../lib/scheduleSlots'
import {
  getConsultationRequestsForStaff,
  getMarkedDaysFromRequests,
  getYouthFreeSlotsForMonth,
  mergeYouthFreeDaySlots,
  respondToConsultationRequest,
} from '../../services/scheduleService'

function RequestCard({ request, youthName, onRespond, respondingId }) {
  const startHour = Number(String(request.start_time).slice(0, 2))
  const endHour = Number(String(request.end_time).slice(0, 2))
  const isPending = request.status === 'pending'
  const isResponding = respondingId === request.id

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {new Date(request.slot_date).toLocaleDateString('en-SG', {
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

      {isPending && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={isResponding}
            onClick={() => onRespond(request.id, true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={isResponding}
            onClick={() => onRespond(request.id, false)}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}

export default function YouthScheduleTab({ detail, staffId, onUpdated }) {
  const window = useMemo(() => getCalendarWindow(), [])
  const initial = useMemo(() => getInitialCalendarMonth(), [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [freeSlots, setFreeSlots] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const selectedDateKey = formatDateKey(year, month, selectedDay)
  const dayFreeSlots = useMemo(
    () => mergeYouthFreeDaySlots(selectedDateKey, freeSlots).filter((slot) => slot.isFree),
    [selectedDateKey, freeSlots],
  )
  const markedDays = useMemo(
    () => [...new Set([...getMarkedDaysFromRequests(requests), ...freeSlots.map((s) => Number(s.slot_date.split('-')[2]))])],
    [requests, freeSlots],
  )
  const pendingRequests = requests.filter((request) => request.status === 'pending')

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [free, consultationRequests] = await Promise.all([
        getYouthFreeSlotsForMonth(detail.id, year, month),
        getConsultationRequestsForStaff(staffId, { youthId: detail.id }),
      ])
      setFreeSlots(free)
      setRequests(consultationRequests)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load student schedule.')
    } finally {
      setLoading(false)
    }
  }, [detail.id, staffId, year, month])

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

  async function handleRespond(requestId, accept) {
    setRespondingId(requestId)
    setNotice('')
    setErrorMessage('')
    try {
      await respondToConsultationRequest(requestId, accept)
      setNotice(accept ? 'Consultation accepted. Your schedule has been updated.' : 'Consultation rejected.')
      await loadData()
      onUpdated?.()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update consultation request.')
    } finally {
      setRespondingId('')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{detail.name}&rsquo;s Schedule</h1>
        <p className="mt-2 text-slate-600">
          Review free timings and respond to consultation requests. Accepting updates both schedules.
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
            legend="Dots mark consultation requests or free timings."
          />

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Free timings on selected day</h2>
              {dayFreeSlots.length ? (
                <ul className="mt-3 space-y-2">
                  {dayFreeSlots.map((slot) => (
                    <li
                      key={slot.startHour}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
                    >
                      {slot.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No free timings recorded for this date.</p>
              )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-800">Consultation requests</h2>
                {pendingRequests.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {pendingRequests.length} pending
                  </span>
                )}
              </div>

              {requests.length ? (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      youthName={detail.name}
                      onRespond={handleRespond}
                      respondingId={respondingId}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No consultation requests from this student yet.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
