import {
  buildSessionSummaryFromMessages,
  resolveAiSessionSummary,
  isWeakSessionSummary,
} from '../src/lib/sessionSummary.js'

const messages = [
  { sender: 'youth', message: "I'm feeling sad today." },
  { sender: 'youth', message: 'I have been overwhelmed for a year' },
  { sender: 'youth', message: 'my parents keep scolding me about grades' },
  { sender: 'youth', message: 'classmates bully me and throw things at me' },
  { sender: 'youth', message: 'only playing minecraft can make me feel better' },
  { sender: 'youth', message: 'my grades are continuously dropping' },
]

const session = {
  ai_summary: 'Youth feels overwhelmed for a year; grades are continuously dropping.',
  mood_check_in: 'Sad',
}

console.log('weak stored?', isWeakSessionSummary(session.ai_summary, messages))
const resolved = resolveAiSessionSummary(session, messages, 'lifei12')
console.log('resolved length:', resolved.length)
console.log(resolved)
