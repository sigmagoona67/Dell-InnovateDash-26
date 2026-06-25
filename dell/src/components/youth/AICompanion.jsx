import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { MOODS } from '../../lib/youthMockData'
import { recordMood, sendChatMessage } from '../../services/aiService'
import {
  getOrCreateTodaySession,
  getSessionMessages,
  mapMessagesForUi,
} from '../../services/chatService'
import { Button, ChatBubble, Skeleton, TypingBubble } from '../ui'
import { CrisisBanner, CrisisTrigger } from './CrisisSupport'

const EXAMPLE_PROMPTS = [
  'I had a tough day at school.',
  'I just need someone to listen.',
]

export default function AICompanion({ youthId, youthName }) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [moodDone, setMoodDone] = useState(false)
  const bottomRef = useRef(null)

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
        setErrorMessage(error.message || 'We could not open your space just now. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [youthId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

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
      setErrorMessage(error.message || 'We could not save your check-in. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function submitMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || !session || sending) return

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
      setErrorMessage(error.message || 'Your message did not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleSend(event) {
    event.preventDefault()
    submitMessage(input)
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div role="status" aria-live="polite" className="space-y-4">
          <span className="sr-only">Preparing your space…</span>
          <Skeleton variant="line" className="w-40" />
          <Skeleton variant="block" />
          <Skeleton variant="block" />
        </div>
      </div>
    )
  }

  if (!moodDone) {
    return (
      <div className="flex h-full flex-col">
        <header className="mb-8">
          <h1 className="font-display text-[30px] font-bold leading-[1.1] text-ink-800">
            Daily check-in
          </h1>
          <p className="mt-2 text-[15px] leading-[1.55] text-slate-600">
            How are you feeling today, {youthName}?
          </p>
        </header>

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-card border border-danger-100 bg-danger-100 px-4 py-3 text-[15px] text-danger-700"
          >
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
              className="group flex flex-col items-center justify-center rounded-card border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 motion-safe:hover:-translate-y-1 hover:border-teal-100 motion-safe:hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <span
                className="mb-3 text-4xl transition-transform motion-safe:group-hover:scale-110"
                role="img"
                aria-label={mood.label}
              >
                {mood.emoji}
              </span>
              <span className="text-[15px] font-bold text-slate-800">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const isHighRisk = session?.risk_level === 'high'
  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full min-h-[32rem] flex-col">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-[30px] font-bold leading-[1.1] text-ink-800">
            AI companion
          </h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500">
            A safe space to talk, anytime after hours.
          </p>
        </div>
        <CrisisTrigger variant="header" />
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="mb-4 rounded-card border border-danger-100 bg-danger-100 px-4 py-3 text-[15px] text-danger-700"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-card border border-slate-200 bg-slate-50 p-4">
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
            <h2 className="font-display text-[22px] font-semibold leading-tight text-ink-800">
              This is your space
            </h2>
            <p className="mt-2 max-w-sm text-[15px] leading-[1.55] text-slate-600">
              Tell me anything — I&apos;m listening. There&apos;s no rush and no wrong thing to say.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={sending}
                  onClick={() => submitMessage(prompt)}
                  className="rounded-pill bg-white px-4 py-2 text-[13px] font-medium text-teal-600 ring-1 ring-teal-100 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <ChatBubble key={`${msg.role}-${index}`} side={msg.role === 'user' ? 'youth' : 'ai'}>
                {msg.text}
              </ChatBubble>
            ))}
            {sending && <TypingBubble />}
          </>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {isHighRisk && <CrisisBanner className="mt-4" />}

      <form onSubmit={handleSend} className="mt-4 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="companion-message" className="sr-only">
            Type your message
          </label>
          <input
            id="companion-message"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your message…"
            disabled={sending}
            className="w-full rounded-control border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:bg-slate-100"
          />
        </div>
        <Button
          type="submit"
          accent="teal"
          size="lg"
          loading={sending}
          disabled={!input.trim()}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
