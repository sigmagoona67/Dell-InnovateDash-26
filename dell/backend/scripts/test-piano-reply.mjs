/**
 * E2E: mood Sad + "ilike piano" should NOT return sad template or crisis panel flags.
 */
import { isCasualPositiveMessage, buildQuickFallbackReply } from '../../src/lib/youthChatReply.js'

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:3016'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(isCasualPositiveMessage('ilike piano'), 'ilike piano should be casual positive')
assert(isCasualPositiveMessage('i like cookie'), 'i like cookie should be casual positive')
const fb = buildQuickFallbackReply('ilike piano')
assert(!fb.includes('feeling sad today'), 'fallback must not be sad template')
assert(fb.includes('music') || fb.includes('piano') || fb.includes('glad'), 'fallback should be positive')

async function authYouth() {
  const email = `piano-test-${Date.now()}@carebridge.test`
  const password = 'TestPass123!'
  const signup = await fetch(`${GATEWAY}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const sj = await signup.json()
  if (!sj.accessToken) throw new Error('signup failed: ' + JSON.stringify(sj))

  const patch = await fetch(`${GATEWAY}/api/v1/auth/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sj.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'youth', email, name: 'Piano Test' }),
  })
  const pj = await patch.json()
  const userId = pj.user?.id || sj.user?.id

  const { createClient } = await import('../lib/createClient.js')
  const client = createClient({ edgeFunctionToken: sj.accessToken })
  let { data: profile } = await client.database
    .from('profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (!profile?.id) {
    const inserted = await client.database
      .from('profiles')
      .insert([{ auth_user_id: userId, email, role: 'youth', display_name: 'Piano Test' }])
      .select('id')
      .single()
    profile = inserted.data
  }
  if (!profile?.id) throw new Error('profile missing after signup')

  const { data: youth } = await client.database
    .from('youth_profiles')
    .insert([
      {
        user_id: profile.id,
        preferred_name: 'Piano Test',
        assignment_status: 'pending',
        onboarding_completed: true,
      },
    ])
    .single()

  const today = new Date().toISOString().slice(0, 10)
  const { data: session } = await client.database
    .from('ai_chat_sessions')
    .insert([{ youth_id: youth.id, session_date: today, title: 'piano test', risk_level: 'low' }])
    .single()

  return { token: sj.accessToken, sessionId: session.id, youthId: youth.id, client }
}

async function invoke(token, body) {
  const res = await fetch(`${GATEWAY}/api/v1/ai-chat/invoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return { status: res.status, body: json }
}

const { token, sessionId, youthId, client } = await authYouth()

const mood = await invoke(token, { action: 'recordMood', sessionId, mood: 'Sad' })
assert(mood.status === 200, 'recordMood failed: ' + JSON.stringify(mood.body))

const chat = await invoke(token, { action: 'sendMessage', sessionId, message: 'ilike piano' })
assert(chat.status === 200, 'sendMessage failed: ' + JSON.stringify(chat.body))
assert(!String(chat.body.reply || '').includes('feeling sad today'), 'API reply must not be sad template')
assert(chat.body.riskLevel === 'low', `risk should be low, got ${chat.body.riskLevel}`)
assert(!chat.body.crisisDetected, 'crisisDetected must be false')
assert(!chat.body.escalationNeeded, 'escalationNeeded must be false')

const { loadYouthInsights } = await import('../../src/services/insightsFallbackService.js')
const { insights } = await loadYouthInsights(client.database, youthId, 'Piano Test')
const interests = insights?.dynamic_profile?.interests || []
assert(
  interests.some((i) => /piano|music/i.test(String(i))),
  `profile interests should include piano/music, got ${JSON.stringify(interests)}`,
)

console.log('PASS piano-reply test')
console.log('reply preview:', String(chat.body.reply).slice(0, 120))
console.log('interests:', interests)
