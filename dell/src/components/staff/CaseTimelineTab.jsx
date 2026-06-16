import { useCallback, useEffect, useMemo, useState } from 'react'
import { requireInsforge } from '../../lib/insforgeClient'
import { getSessionMessages, mapMessagesForUi } from '../../services/chatService'
import { loadYouthInsights } from '../../services/insightsFallbackService'
import { canStaffEditYouth } from '../../services/staffService'
import CaseTimelineCalendar from './CaseTimelineCalendar'
import OfflineSessionSummaryView from './OfflineSessionSummaryView'
import RiskBadge from './RiskBadge'
import StaffAiSummaryPanel from './StaffAiSummaryPanel'

function eventPickerLabel(event) {
  if (event.type === 'ai') return 'AI Chat'
  const doc = event.document_name?.replace(/\.[^.]+$/, '')
  if (doc && doc.length <= 24) return `Offline · ${doc}`
  if (doc) return `Offline · ${doc.slice(0, 21)}…`
  return 'Offline Session'
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-teal-500 text-white' : 'border border-slate-100 bg-white text-slate-700'
        }`}
      >
        {text}
      </div>
    </div>
  )
}

export default function CaseTimelineTab({ detail, refreshKey = 0, staffProfileId = null, canEdit = false }) {
  const youthId = detail?.youth?.id
  const youthName = detail?.name
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`

  const [aiSessions, setAiSessions] = useState([])
  const [offlineSessions, setOfflineSessions] = useState([])
  const [sessionsError, setSessionsError] = useState('')

  const [selectedDay, setSelectedDay] = useState(null)
  const [dayEvents, setDayEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [viewTab, setViewTab] = useState('original')
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [insights, setInsights] = useState(detail?.insights || {})
  const [insightsLoading, setInsightsLoading] = useState(true)
  const canSaveEdits = canStaffEditYouth(detail?.youth, staffProfileId)

  useEffect(() => {
    if (!youthId) {
      setInsights({})
      setInsightsLoading(false)
      return
    }

    let cancelled = false

    async function loadInsights() {
      setInsightsLoading(true)
      try {
        const result = await loadYouthInsights(requireInsforge().database, youthId, youthName)
        if (!cancelled) setInsights(result.insights || {})
      } catch {
        if (!cancelled) setInsights(detail?.insights || {})
      } finally {
        if (!cancelled) setInsightsLoading(false)
      }
    }

    loadInsights()
    return () => {
      cancelled = true
    }
  }, [youthId, youthName, refreshKey])

  const loadSessions = useCallback(async () => {
    if (!youthId) return

    const [aiResult, offlineResult] = await Promise.all([
      requireInsforge()
        .database.from('ai_chat_sessions')
        .select('*')
        .eq('youth_id', youthId)
        .order('session_date', { ascending: false }),
      requireInsforge()
        .database.from('offline_counselling_sessions')
        .select('*')
        .eq('youth_id', youthId)
        .eq('status', 'approved')
        .order('session_date', { ascending: false }),
    ])

    if (aiResult.error || offlineResult.error) {
      const msg = aiResult.error?.message || offlineResult.error?.message || 'Failed to load sessions'
      const missingOffline = String(msg).toLowerCase().includes('offline_counselling_sessions')
      setSessionsError(
        missingOffline
          ? 'Offline session table is not set up yet. Open scripts/APPLY-OFFLINE-SESSIONS-COMPLETE.sql in InsForge SQL Editor, copy ALL SQL, and Run.'
          : msg,
      )
      setAiSessions([])
      setOfflineSessions([])
      return
    }

    setSessionsError('')
    setAiSessions(aiResult.data || [])
    setOfflineSessions(offlineResult.data || [])
  }, [youthId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions, refreshKey])

  const handleSessionUpdated = useCallback((updated) => {
    if (!updated) return
    if (selectedEvent?.type === 'ai' && selectedEvent?.id === updated.id) {
      setSelectedEvent((prev) => ({ ...prev, ...updated }))
      setAiSessions((rows) => rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
    }
    if (selectedEvent?.type === 'offline' && selectedEvent?.id === updated.id) {
      setSelectedEvent((prev) => ({ ...prev, ...updated }))
      setOfflineSessions((rows) => rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
    }
  }, [selectedEvent?.id, selectedEvent?.type])

  const allEvents = useMemo(() => {
    const ai = aiSessions.map((s) => ({ ...s, type: 'ai' }))
    const offlineByDate = new Map()

    for (const session of offlineSessions) {
      const key = session.session_date
      const existing = offlineByDate.get(key)
      if (!existing || new Date(session.updated_at || 0) > new Date(existing.updated_at || 0)) {
        offlineByDate.set(key, session)
      }
    }

    const offline = [...offlineByDate.values()].map((s) => ({ ...s, type: 'offline' }))
    return [...ai, ...offline].sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
  }, [aiSessions, offlineSessions])

  const aiDays = useMemo(
    () =>
      allEvents
        .filter((e) => e.type === 'ai' && e.session_date?.startsWith(monthPrefix))
        .map((e) => Number(e.session_date.split('-')[2])),
    [allEvents, monthPrefix],
  )

  const offlineDays = useMemo(
    () =>
      allEvents
        .filter((e) => e.type === 'offline' && e.session_date?.startsWith(monthPrefix))
        .map((e) => Number(e.session_date.split('-')[2])),
    [allEvents, monthPrefix],
  )

  useEffect(() => {
    async function loadMessages() {
      if (!selectedEvent || selectedEvent.type !== 'ai') {
        setMessages([])
        return
      }

      setMessagesLoading(true)
      try {
        const rows = await getSessionMessages(selectedEvent.id)
        const uiMessages = mapMessagesForUi(rows)
        console.log('Staff timeline messages:', uiMessages, null)
        setMessages(uiMessages)
      } catch (error) {
        console.log('Staff timeline messages:', [], error)
        setMessages([])
      } finally {
        setMessagesLoading(false)
      }
    }

    loadMessages()
  }, [selectedEvent])

  useEffect(() => {
    setViewTab('original')
  }, [selectedEvent])

  function handleSelectDay(day) {
    setSelectedDay(day)
    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`
    const events = allEvents.filter((e) => e.session_date === date)
    setDayEvents(events)
    setSelectedEvent(events[0] || null)
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Case Timeline</h2>
        <p className="mt-1 text-sm text-slate-500">Complete history of AI chats and offline counselling sessions</p>
      </header>

      {sessionsError && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{sessionsError}</p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-80 lg:shrink-0">
          <CaseTimelineCalendar
            year={year}
            month={month}
            aiDays={aiDays}
            offlineDays={offlineDays}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
          />
        </div>

        <div className="min-h-[20rem] flex-1 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          {!selectedEvent ? (
            <p className="text-slate-500">Select a marked date to view session details.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedEvent.type === 'ai' ? '🔵 AI Chat' : '🟡 Offline Counselling'} · {selectedEvent.session_date}
                </h3>
                <RiskBadge level={selectedEvent.risk_level || 'low'} />
              </div>

              {dayEvents.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sessions on this day</p>
                  <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
                    {dayEvents.map((event) => (
                      <button
                        key={`${event.type}-${event.id}`}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                          selectedEvent.id === event.id && selectedEvent.type === event.type
                            ? 'bg-white text-sky-700 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        {eventPickerLabel(event)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">View</p>
                <div className="inline-flex rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewTab('original')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    viewTab === 'original' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {selectedEvent.type === 'ai' ? 'Original Chat' : 'Original Transcript'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('summary')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    viewTab === 'summary' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  AI Summary
                </button>
                </div>
              </div>

              {selectedEvent.type === 'ai' && viewTab === 'original' && (
                <section>
                  <h4 className="text-sm font-semibold text-slate-700">Original Chat</h4>
                  <div className="mt-2 max-h-96 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                    {messagesLoading ? (
                      <p className="text-sm text-slate-500">Loading messages…</p>
                    ) : messages.length > 0 ? (
                      messages.map((msg, index) => <ChatBubble key={index} role={msg.role} text={msg.text} />)
                    ) : (
                      <p className="text-sm text-slate-500">No messages recorded for this date.</p>
                    )}
                  </div>
                </section>
              )}

              {selectedEvent.type === 'ai' && viewTab === 'summary' && (
                <StaffAiSummaryPanel
                  insights={insights}
                  youthName={youthName}
                  session={selectedEvent}
                  messages={messages}
                  loading={insightsLoading}
                  moodCheckIn={selectedEvent.mood_check_in}
                  riskLevel={selectedEvent.risk_level}
                  staffProfileId={staffProfileId}
                  canEdit={canSaveEdits}
                  onSessionUpdated={handleSessionUpdated}
                />
              )}

              {selectedEvent.type === 'offline' && viewTab === 'original' && (
                <section>
                  {selectedEvent.document_name && (
                    <p className="mb-2 text-xs text-slate-500">Source document: {selectedEvent.document_name}</p>
                  )}
                  <p className="whitespace-pre-wrap rounded-2xl bg-amber-50/50 p-4 text-sm leading-relaxed text-slate-700">
                    {selectedEvent.transcript || 'No transcript recorded yet.'}
                  </p>
                </section>
              )}

              {selectedEvent.type === 'offline' && viewTab === 'summary' && (
                <OfflineSessionSummaryView
                  session={selectedEvent}
                  youthName={youthName}
                  staffProfileId={staffProfileId}
                  canEdit={canSaveEdits}
                  onSessionUpdated={handleSessionUpdated}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
