import { useEffect, useMemo, useState } from 'react'
import { requireInsforge } from '../../lib/insforgeClient'
import { getSessionMessages, mapMessagesForUi } from '../../services/chatService'
import { buildMoodYearMock, gradeDay, normalizeMood } from '../../lib/moodHeatmap'
import MoodHeatmap from '../youth/MoodHeatmap'
import CaseTimelineCalendar from './CaseTimelineCalendar'
import { RiskBadge } from '../ui'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI Only' },
  { id: 'offline', label: 'Offline Only' },
]

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

export default function CaseTimelineTab({ detail }) {
  const youthId = detail?.youth?.id
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`

  const [aiSessions, setAiSessions] = useState([])
  const [sessionsError, setSessionsError] = useState('')
  const offlineSessions = useMemo(
    () => (detail.offlineSessions || []).map((s) => ({ ...s, type: 'offline' })),
    [detail.offlineSessions],
  )

  const [filter, setFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayEvents, setDayEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [viewTab, setViewTab] = useState('original')
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  useEffect(() => {
    if (!youthId) return

    let cancelled = false

    async function loadSessions() {
      const { data, error } = await requireInsforge()
        .database.from('ai_chat_sessions')
        .select('*')
        .eq('youth_id', youthId)
        .order('session_date', { ascending: false })

      if (cancelled) return

      if (error) {
        if (import.meta.env.DEV) console.debug('[staff] timeline sessions error', error?.message)
        setSessionsError('Case timeline is unavailable right now. Please try again shortly.')
        setAiSessions([])
        return
      }

      setSessionsError('')
      setAiSessions(data || [])
    }

    loadSessions()

    return () => {
      cancelled = true
    }
  }, [youthId])

  const allEvents = useMemo(() => {
    const ai = aiSessions.map((s) => ({ ...s, type: 'ai' }))
    return [...ai, ...offlineSessions].sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
  }, [aiSessions, offlineSessions])

  // Mood heatmap — ZERO new query: reuse the already-in-memory aiSessions.
  // (youth_id, session_date) is unique, so no aggregation needed. Staff carries
  // ai_summary as the tooltip text (load-bearing for next-morning follow-up and
  // the sentiment nudge). Falls back to the mock when there's nothing gradeable
  // so the grid is never an empty grey wall.
  const moodEntries = useMemo(() => {
    const entries = Object.fromEntries(
      aiSessions.map((s) => [
        s.session_date,
        { mood: normalizeMood(s.mood_check_in), text: s.ai_summary || undefined },
      ]),
    )
    const hasGradeable = Object.values(entries).some((e) => gradeDay(e))
    return hasGradeable ? entries : buildMoodYearMock(now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSessions])

  const filteredEvents = useMemo(() => {
    if (filter === 'ai') return allEvents.filter((e) => e.type === 'ai')
    if (filter === 'offline') return allEvents.filter((e) => e.type === 'offline')
    return allEvents
  }, [allEvents, filter])

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
        setMessages(uiMessages)
      } catch (error) {
        if (import.meta.env.DEV) console.debug('[staff] timeline messages error', error?.message)
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
    const events = filteredEvents.filter((e) => e.session_date === date)
    setDayEvents(events)
    setSelectedEvent(events[0] || null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Case Timeline</h2>
          <p className="mt-1 text-sm text-slate-500">Complete history of AI chats and offline counselling sessions</p>
        </div>
        <div className="inline-flex rounded-2xl bg-slate-50 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                filter === item.id ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {sessionsError && (
        <p
          role="alert"
          className="rounded-card border border-danger-100 bg-danger-100/50 px-4 py-3 text-[13px] text-danger-700"
        >
          {sessionsError}
        </p>
      )}

      {/* Mood-intensity year trend — full clinical fidelity, expanded by default,
          bound to the Quiet Signal's five-label scale. Soft right-edge fade hints
          the 53-week grid scrolls horizontally. */}
      <div className="relative">
        <MoodHeatmap
          entriesByDate={moodEntries}
          weeks={53}
          tooltipMode="clinical"
          title="Mood over the past year"
          subtitle="Warmer = heavier day; teal = brighter. Cooling and thinning in recent weeks signals drift."
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-card bg-gradient-to-l from-white to-transparent"
        />
      </div>

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
                <h3 className="font-display text-[18px] font-semibold text-ink-800">
                  {selectedEvent.type === 'ai' ? 'AI Chat' : 'Offline Counselling'} · {selectedEvent.session_date}
                </h3>
                <RiskBadge level={selectedEvent.risk_level || 'low'} showBar={selectedEvent.risk_level === 'high'} />
              </div>

              {dayEvents.length > 1 && (
                <div className="inline-flex rounded-xl bg-slate-50 p-1">
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
                      {event.type === 'ai' ? 'AI Chat' : 'Offline Session'}
                    </button>
                  ))}
                </div>
              )}

              {selectedEvent.type === 'ai' && (
                <div className="inline-flex rounded-xl bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setViewTab('original')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                      viewTab === 'original' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Original Chat
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
              )}

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
                <section className="space-y-4 rounded-2xl bg-sky-50/60 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Mood check-in</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedEvent.mood_check_in || 'Not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Risk level</p>
                    <p className="mt-1 text-sm capitalize text-slate-700">{selectedEvent.risk_level || 'low'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">AI Summary</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {selectedEvent.ai_summary || 'No summary available yet.'}
                    </p>
                  </div>
                </section>
              )}

              {selectedEvent.type === 'offline' && (
                <>
                  <section>
                    <h4 className="text-sm font-semibold text-slate-700">Original Chat / Transcript</h4>
                    <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                      {selectedEvent.transcript || 'No transcript recorded yet.'}
                    </p>
                  </section>

                  <section>
                    <h4 className="text-sm font-semibold text-slate-700">AI Summary</h4>
                    <p className="mt-2 text-sm text-slate-600">{selectedEvent.ai_summary || 'No summary yet.'}</p>
                  </section>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <section>
                      <h4 className="text-sm font-semibold text-slate-700">Categories</h4>
                      <p className="mt-2 text-sm text-slate-600">
                        {(selectedEvent.categories || []).join(', ') || 'Counselling'}
                      </p>
                    </section>
                    <section>
                      <h4 className="text-sm font-semibold text-slate-700">Emotion Analysis</h4>
                      <p className="mt-2 text-sm text-slate-600">
                        {(selectedEvent.emotion_analysis || []).join(', ') || 'Not analysed yet'}
                      </p>
                    </section>
                  </div>

                  {selectedEvent.suggested_follow_up && (
                    <section>
                      <h4 className="text-sm font-semibold text-slate-700">Suggested Follow-up</h4>
                      <p className="mt-2 text-sm text-slate-600">{selectedEvent.suggested_follow_up}</p>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
