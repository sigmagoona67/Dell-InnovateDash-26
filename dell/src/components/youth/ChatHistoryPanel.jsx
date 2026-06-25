import { useEffect, useMemo, useState } from 'react'
import MonthCalendar from './MonthCalendar'
import MoodHeatmap from './MoodHeatmap'
import {
  getMoodYear,
  getSessionByDate,
  getSessionMessages,
  getSessionsForMonth,
  mapMessagesForUi,
} from '../../services/chatService'
import { buildMoodYearMock, gradeDay, normalizeMood } from '../../lib/moodHeatmap'
import { ChatBubble, RiskBadge, Skeleton } from '../ui'

// Youth window: 90 days (13 weeks) by default — fits a phone with no backward
// horizontal scroll through a wall of warm squares. A deliberate second tap
// opens the full year for a recovering youth who finds the brightening grid
// motivating; the 53-week constraint never cold-opens here.
const YOUTH_WEEKS = 13
const FULL_YEAR_WEEKS = 53

// Map mood rows -> entriesByDate. Youth path carries NO text (no ai_summary /
// risk language). normalizeMood is a defensive guard so a present-but-unmappable
// session still grades as PRESENT (never grey) via gradeDay.
function moodEntriesFromRows(rows) {
  return Object.fromEntries(rows.map((r) => [r.session_date, { mood: normalizeMood(r.mood_check_in) }]))
}

// A grid is "real" only if at least one row grades. Otherwise fall back to the
// mock so the youth never faces an empty grey wall.
function hasGradeableEntries(entries) {
  return Object.values(entries).some((e) => gradeDay(e))
}

export default function ChatHistoryPanel({ youthId, onTalkNow }) {
  const now = new Date()
  const [year] = useState(now.getFullYear())
  const [month] = useState(now.getMonth() + 1)
  const [sessions, setSessions] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [tab, setTab] = useState('original')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // Mood heatmap — opt-in disclosure, collapsed on every visit (state only).
  const [heatmapOpen, setHeatmapOpen] = useState(false)
  const [showFullYear, setShowFullYear] = useState(false)
  const [moodEntries, setMoodEntries] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadMood() {
      try {
        // ~371 days when the youth opts into the full year, else ~98 (14wk).
        const rows = await getMoodYear(youthId, { now: new Date(), days: showFullYear ? 371 : 98 })
        if (cancelled) return
        const entries = moodEntriesFromRows(rows)
        setMoodEntries(hasGradeableEntries(entries) ? entries : buildMoodYearMock(new Date()))
      } catch {
        // Supplementary surface — fail silently to the mock, never block History.
        if (!cancelled) setMoodEntries(buildMoodYearMock(new Date()))
      }
    }
    loadMood()
    return () => {
      cancelled = true
    }
  }, [youthId, showFullYear])

  const markedDays = useMemo(
    () => sessions.map((session) => Number(session.session_date.split('-')[2])),
    [sessions],
  )

  useEffect(() => {
    async function loadMonth() {
      setLoading(true)
      setErrorMessage('')
      try {
        const monthSessions = await getSessionsForMonth(youthId, year, month)
        setSessions(monthSessions)
        if (monthSessions.length > 0) {
          const firstDay = Number(monthSessions[0].session_date.split('-')[2])
          setSelectedDay(firstDay)
          setSelectedSession(monthSessions[0])
        }
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load chat history.')
      } finally {
        setLoading(false)
      }
    }

    loadMonth()
  }, [youthId, year, month])

  useEffect(() => {
    async function loadMessages() {
      if (!selectedSession) {
        setMessages([])
        return
      }

      try {
        const rows = await getSessionMessages(selectedSession.id)
        setMessages(mapMessagesForUi(rows))
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load messages for this date.')
      }
    }

    loadMessages()
  }, [selectedSession])

  async function handleSelectDay(day) {
    setSelectedDay(day)
    setErrorMessage('')
    const sessionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    try {
      const session = await getSessionByDate(youthId, sessionDate)
      setSelectedSession(session)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load session for this date.')
    }
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">Loading your chat history…</span>
        <Skeleton variant="line" className="w-48" />
        <Skeleton variant="block" />
        <Skeleton variant="block" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Year-in-check-ins heatmap — collapsed, gentle opt-in disclosure. */}
      <section className="rounded-card border border-slate-200 bg-white shadow-card">
        {!heatmapOpen ? (
          <button
            type="button"
            onClick={() => setHeatmapOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-card px-5 py-4 text-left transition hover:bg-teal-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:px-6"
          >
            <span className="text-[15px] font-medium text-teal-700">
              See your last few months — open when you're ready
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5 shrink-0 text-teal-600"
            >
              <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <div className="p-5 sm:p-6">
            {moodEntries ? (
              <>
                <MoodHeatmap
                  entriesByDate={moodEntries}
                  weeks={showFullYear ? FULL_YEAR_WEEKS : YOUTH_WEEKS}
                  tooltipMode="warm"
                  showCount={false}
                  title="Every time you reached out"
                  subtitle="Each square is a day you checked in — that took something. Quieter days and brighter days are all part of your story, and grey just means a day off. Rest is okay."
                  legendLow="quieter day"
                  legendHigh="brighter day"
                  noCheckInLabel="a day off — that's okay"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFullYear((v) => !v)}
                    className="text-[13px] font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    {showFullYear ? 'Show the last few months' : 'See my whole year'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHeatmapOpen(false)
                      setShowFullYear(false)
                    }}
                    className="text-[13px] font-medium text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    Close
                  </button>
                </div>
                {/* Forward-looking, low-friction support action — never leave the
                    youth alone staring at the grid. */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-card bg-teal-50 px-4 py-3">
                  <p className="text-[14px] text-teal-800">Want to talk now?</p>
                  <button
                    type="button"
                    onClick={() => onTalkNow?.()}
                    className="shrink-0 rounded-pill bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    Talk to your companion
                  </button>
                </div>
              </>
            ) : (
              <Skeleton variant="block" />
            )}
          </div>
        )}
      </section>

      <div className="flex h-full flex-col gap-6 lg:flex-row">
        <div className="lg:w-80 lg:shrink-0">
        <header className="mb-4">
          <h1 className="font-display text-[30px] font-bold leading-[1.1] text-ink-800">Chat history</h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500">Days you talked are marked in blue.</p>
        </header>
        <MonthCalendar
          year={year}
          month={month}
          markedDays={markedDays}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
        />
      </div>

      <div className="flex min-h-[24rem] flex-1 flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-card border border-danger-100 bg-danger-100 px-4 py-3 text-[15px] text-danger-700"
          >
            {errorMessage}
          </p>
        )}

        {!selectedSession ? (
          <p className="text-[15px] text-slate-600">No conversations yet this month.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <h2 className="font-display text-[18px] font-semibold leading-tight text-ink-800">
                {new Date(selectedSession.session_date).toLocaleDateString('en-SG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <div className="inline-flex rounded-control bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setTab('original')}
                  className={`rounded-control px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${tab === 'original' ? 'bg-white text-sky-600 shadow-card' : 'text-slate-500'}`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setTab('summary')}
                  className={`rounded-control px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${tab === 'summary' ? 'bg-white text-sky-600 shadow-card' : 'text-slate-500'}`}
                >
                  Summary
                </button>
              </div>
            </div>

            {tab === 'original' ? (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                {messages.map((msg, index) => (
                  <ChatBubble key={index} side={msg.role === 'user' ? 'youth' : 'ai'}>
                    {msg.text}
                  </ChatBubble>
                ))}
              </div>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto rounded-card bg-sky-50 p-4">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">Mood check-in</p>
                  <p className="mt-1 text-[15px] text-slate-800">{selectedSession.mood_check_in || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">Risk level</p>
                  <div className="mt-1.5">
                    <RiskBadge level={selectedSession.risk_level || 'low'} showBar />
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">AI summary</p>
                  <p className="mt-1 text-[15px] leading-[1.55] text-slate-800">
                    {selectedSession.ai_summary || 'No summary available yet.'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}
