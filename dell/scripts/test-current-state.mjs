import { buildCurrentStateFromMessages, resolveCurrentState } from '../src/lib/currentState.js'

const messages = [
  { sender: 'youth', message: "I'm feeling Overwhelmed today." },
  { sender: 'youth', message: '我爸妈吵架了' },
  { sender: 'youth', message: '学校有人霸凌我' },
  { sender: 'youth', message: '他们往我身上扔东西' },
  { sender: 'youth', message: '只有弹钢琴能让我好一点' },
]

const state = buildCurrentStateFromMessages(messages)
console.log('Current state:', state)

if (!state.includes('Feeling overwhelmed')) {
  console.error('FAIL: missing Feeling overwhelmed from mood check-in')
  process.exit(1)
}
if (!state.some((t) => /bullying|family/i.test(t))) {
  console.error('FAIL: missing bullying or family conflict')
  process.exit(1)
}
if (state.length === 1 && state[0] === 'Recently engaged with AI companion') {
  console.error('FAIL: generic only state')
  process.exit(1)
}

const merged = resolveCurrentState({
  saved: ['Recently engaged with AI companion'],
  messages,
})
console.log('Resolved:', merged)
if (merged.includes('Recently engaged with AI companion') && merged.length === 1) {
  console.error('FAIL: resolve kept generic only')
  process.exit(1)
}
console.log('Current state checks passed.')
