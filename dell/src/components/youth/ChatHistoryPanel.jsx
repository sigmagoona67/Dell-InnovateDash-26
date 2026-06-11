import { useEffect, useMemo, useState } from 'react'
import MonthCalendar from './MonthCalendar'
import {
  getSessionByDate,
  getSessionMessages,
  getSessionsForMonth,
  mapMessagesForUi,
} from '../../services/chatService'

function ChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isUser ? 'bg-teal-500 text-white' : 'border border-slate-100 bg-white text-slate-700'}
        `}
      >
        {text}
      </div>
    </div>
  )
}

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
    return <p className="text-slate-500">Loading chat history...</p>
  }

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      <div className="lg:w-80 lg:shrink-0">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-slate-800">Chat History</h1>
          <p className="mt-1 text-sm text-slate-500">Dates with conversations are marked in blue.</p>
        </header>
        <MonthCalendar
          year={year}
          month={month}
          markedDays={markedDays}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
        />
      </div>

      <div className="flex min-h-[24rem] flex-1 flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        {errorMessage && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        {!selectedSession ? (
          <p className="text-slate-500">No conversations yet for this month.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <h2 className="font-semibold text-slate-800">
                {new Date(selectedSession.session_date).toLocaleDateString('en-SG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <div className="inline-flex rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setTab('original')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${tab === 'original' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
                >
                  Original Chat
                </button>
                <button
                  type="button"
                  onClick={() => setTab('summary')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${tab === 'summary' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
                >
                  AI Summary
                </button>
              </div>
            </div>

            {tab === 'original' ? (
              <div className="flex-1 space-y-3 overflow-y-auto">
                {messages.map((msg, index) => (
                  <ChatBubble key={index} role={msg.role} text={msg.text} />
                ))}
              </div>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-sky-50/60 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Mood check-in</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedSession.mood_check_in || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Risk level</p>
                  <p className="mt-1 text-sm capitalize text-slate-700">{selectedSession.risk_level || 'low'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">AI Summary</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
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
