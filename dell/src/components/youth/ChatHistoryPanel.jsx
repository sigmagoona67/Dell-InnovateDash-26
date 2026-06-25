import { useEffect, useMemo, useState } from 'react'
import MonthCalendar from './MonthCalendar'
import {
  getSessionByDate,
  getSessionMessages,
  getSessionsForMonth,
  mapMessagesForUi,
} from '../../services/chatService'
import { ChatBubble, RiskBadge, Skeleton } from '../ui'

export default function ChatHistoryPanel({ youthId }) {
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
  )
}
