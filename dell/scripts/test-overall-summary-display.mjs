import { buildCombinedOverallSummary } from '../src/lib/interactionSummary.js'

const sample = buildCombinedOverallSummary({
  youthName: 'lifei66',
  offlineSessions: [
    {
      status: 'approved',
      session_date: '2026-06-10',
      ai_summary:
        'Emily presented as overwhelmed and withdrawn during the session. Staff focused on exam stress and loneliness.',
    },
  ],
  messages: [
    { sender: 'youth', message: "I'm feeling sad today." },
    {
      sender: 'youth',
      message:
        'my best friend has been hanging out with another group and I eat lunch alone sometimes',
    },
  ],
  latestChange:
    'Emily mentioned that her best friend has been hanging out with another group recently, making her feel left out.',
  currentState: ['Feeling sad', 'Unsafe at home — physical harm reported'],
  mainRisk: ['Social isolation', 'Emotional distress', 'Academic decline'],
  riskLevel: 'high',
})

console.log(sample)
console.log('\n--- checks ---')
console.log('has after-hours label?', /after-hours ai/i.test(sample))
console.log('has offline label?', /offline counselling/i.test(sample))
console.log('has current presentation?', /current presentation/i.test(sample))
