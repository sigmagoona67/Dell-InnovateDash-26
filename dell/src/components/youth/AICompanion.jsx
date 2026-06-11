import { useEffect, useState } from 'react'
import { MOODS } from '../../lib/youthMockData'
import { recordMood, sendChatMessage } from '../../services/aiService'
import {
  getOrCreateTodaySession,
  getSessionMessages,
  mapMessagesForUi,
} from '../../services/chatService'

function ChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm
          ${isUser
            ? 'rounded-br-lg bg-teal-500 text-white'
            : 'rounded-bl-lg border border-slate-100 bg-white text-slate-700'}
        `}
      >
        {text}
      </div>
    </div>
  )
}

export default function AICompanion({ youthId, youthName }) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [moodDone, setMoodDone] = useState(false)

  useEffect(() => {
    async function loadSession() {
      setLoading(true)
      setErrorMessage('')
      try {
        const todaySession = await getOrCreateTodaySession(youthId)
        setSession(todaySession)

        const rows = await getSessionMessages(todaySession.id)
        const uiMessages = mapMessagesForUi(rows)
        setMessages(uiMessages)
        setMoodDone(Boolean(todaySession.mood_check_in) || uiMessages.length > 0)
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load today’s chat session.')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [youthId])

  async function handleMoodSelect(mood) {
    if (!session) return
    setSending(true)
    setErrorMessage('')
    try {
      const result = await recordMood(session.id, mood.label)
      const moodLine = `I'm feeling ${mood.label.toLowerCase()} today.`
      setMessages([
        { role: 'user', text: moodLine },
        { role: 'ai', text: result.reply },
      ])
      setMoodDone(true)
      setSession((prev) => ({ ...prev, mood_check_in: mood.label }))
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save mood check-in.')
    } finally {
      setSending(false)
    }
  }

  async function handleSend(event) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || !session) return

    setSending(true)
    setErrorMessage('')
    const optimistic = [...messages, { role: 'user', text: trimmed }]
    setMessages(optimistic)
    setInput('')

    try {
      const result = await sendChatMessage(session.id, trimmed)
      setMessages([...optimistic, { role: 'ai', text: result.reply }])
      setSession((prev) => ({
        ...prev,
        ai_summary: result.summary,
        risk_level: result.riskLevel,
      }))
    } catch (error) {
      setMessages(messages)
      setInput(trimmed)
      setErrorMessage(error.message || 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center">
        <p className="text-slate-500">Preparing your safe space...</p>
      </div>
    )
  }

  if (!moodDone) {
    return (
      <div className="flex h-full flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Daily Check-in</h1>
          <p className="mt-2 text-slate-600">How are you feeling today, {youthName}?</p>
        </header>

        {errorMessage && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              disabled={sending}
              onClick={() => handleMoodSelect(mood)}
              className="group flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-70"
            >
              <span className="mb-3 text-4xl transition-transform group-hover:scale-110">{mood.emoji}</span>
              <span className="font-semibold text-slate-700">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[32rem] flex-col">
      <header className="mb-4 border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">AI Companion</h1>
        <p className="mt-1 text-sm text-slate-500">A safe space to talk, anytime after hours.</p>
      </header>

      {errorMessage && (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-slate-100 bg-sky-50/40 p-4">
        {messages.map((msg, index) => (
          <ChatBubble key={`${msg.role}-${index}`} role={msg.role} text={msg.text} />
        ))}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type your message..."
          disabled={sending}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-2xl bg-teal-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
