import { buildDynamicProfileFromYouthSpeech, resolveDynamicProfile } from '../src/lib/dynamicProfile.js'
import { inferRiskFromMessages } from '../src/lib/riskInference.js'
import { resolveYouthRiskLevel } from '../src/lib/riskResolver.js'

const pianoMessage = { sender: 'youth', message: '只有弹钢琴会让我开心一点哦' }
const guitarMessage = {
  sender: 'youth',
  message: 'Only thing that helps me relax is playing guitar before I sleep.',
}

const distressHistory = [
  { sender: 'youth', message: '我好崩溃' },
  { sender: 'youth', message: '爸妈昨晚又吵架了' },
  { sender: 'youth', message: '同学欺负我，还跟踪我' },
  { sender: 'youth', message: '只有弹钢琴会让我开心一点哦' },
]

const profile = buildDynamicProfileFromYouthSpeech('只有弹钢琴会让我开心一点哦')
console.log('Piano profile:', profile)

const guitarProfile = buildDynamicProfileFromYouthSpeech(guitarMessage.message)
console.log('Guitar profile:', guitarProfile)

const merged = resolveDynamicProfile({
  savedProfile: { interests: [], coping_methods: [] },
  messages: distressHistory,
  offlineSessions: [],
})
const guitarMerged = resolveDynamicProfile({
  savedProfile: { interests: [], coping_methods: [] },
  messages: [guitarMessage],
  offlineSessions: [],
})
console.log('Merged dynamic profile:', merged)
console.log('Guitar merged profile:', guitarMerged)

const pianoRisk = inferRiskFromMessages([pianoMessage])
const fullRisk = inferRiskFromMessages(distressHistory)
const resolved = resolveYouthRiskLevel({
  insights: { risk_level: 'low' },
  messages: distressHistory,
  aiSessions: [],
  offlineSessions: [],
})

console.log('Piano-only risk:', pianoRisk)
console.log('Full history risk:', fullRisk)
console.log('Resolved (stale low in DB):', resolved)

let failed = 0
if (!profile.interests.includes('Playing piano')) {
  console.error('FAIL: piano not in interests')
  failed++
}
if (!merged.interests.includes('Playing piano')) {
  console.error('FAIL: piano not in merged interests')
  failed++
}
if (!merged.coping_methods.includes('Playing piano')) {
  console.error('FAIL: piano not in coping methods')
  failed++
}
if (!guitarProfile.interests.includes('Playing guitar')) {
  console.error('FAIL: guitar not in interests')
  failed++
}
if (!guitarProfile.coping_methods.includes('Playing guitar before sleep')) {
  console.error('FAIL: guitar before sleep not in coping methods')
  failed++
}
if (!guitarMerged.interests.includes('Playing guitar')) {
  console.error('FAIL: guitar not in merged interests')
  failed++
}
if (fullRisk === 'low') {
  console.error('FAIL: distress history should not be low risk')
  failed++
}
if (resolved === 'low') {
  console.error('FAIL: resolved risk should override stale low')
  failed++
}

if (failed) {
  process.exit(1)
}
console.log('All insight rule checks passed.')
