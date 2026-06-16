import {
  isSessionNoteQuality,
  normalizeSessionNote,
  pickBetterSessionSummary,
  summarizeYouthSpeech,
} from './sessionCaseNote'

const MOOD_CHECKIN_LINE = /^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i

function youthLines(messages = []) {
  return (messages || [])
    .filter((m) => m.sender === 'youth' || m.role === 'user')
    .map((m) => String(m.message || m.text || '').trim())
    .filter((line) => line && !MOOD_CHECKIN_LINE.test(line))
}

export function isWeakSessionSummary(summary) {
  return !isSessionNoteQuality(summary)
}

export function buildSessionSummaryFromMessages(messages = [], { moodCheckIn } = {}) {
  const full = youthLines(messages).join('\n')
  return summarizeYouthSpeech({ text: full, moodCheckIn })
}

export function resolveAiSessionSummary(session, messages = []) {
  const stored = normalizeSessionNote(session?.ai_summary || '')
  const rebuilt = buildSessionSummaryFromMessages(messages, {
    moodCheckIn: session?.mood_check_in,
  })

  if (youthLines(messages).length < 1) return stored || rebuilt
  return pickBetterSessionSummary(stored, rebuilt)
}
