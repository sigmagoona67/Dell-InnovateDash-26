/**
 * Test recordMood invoke after createClient token fix.
 */
import { createClient } from '../lib/createClient.js'

const GATEWAY = 'http://127.0.0.1:3001'
const email = process.argv[2] || `mood-test-${Date.now()}@carebridge.test`
const password = process.argv[3] || 'TestPass123!'

let signin = await fetch(`${GATEWAY}/api/v1/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
let signinJson = await signin.json()

if (!signin.ok) {
  const signup = await fetch(`${GATEWAY}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const signupJson = await signup.json()
  if (!signup.ok) {
    console.error('signup failed', signup.status, signupJson)
    process.exit(1)
  }
  const patch = await fetch(`${GATEWAY}/api/v1/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signupJson.accessToken}`,
    },
    body: JSON.stringify({ role: 'youth', email, name: 'Mood Test' }),
  })
  const patchJson = await patch.json()
  if (!patch.ok) {
    console.error('profile failed', patch.status, patchJson)
    process.exit(1)
  }
  signinJson = { accessToken: patchJson.accessToken || signupJson.accessToken, user: patchJson.user }
}

const token = signinJson.accessToken
const client = createClient({ edgeFunctionToken: token })

const me = await client.auth.getCurrentUser()
console.log('me', me.error?.message || me.data?.user?.profile)

const profileQ = await client.database
  .from('profiles')
  .select('id, role')
  .eq('auth_user_id', me.data.user.id)
  .maybeSingle()
console.log('profile', profileQ.error?.message || profileQ.data)

if (profileQ.data?.role !== 'youth') {
  console.log('Not a youth account — use a youth email/password')
  process.exit(0)
}

const youthQ = await client.database
  .from('youth_profiles')
  .select('id')
  .eq('user_id', profileQ.data.id)
  .maybeSingle()
let youthId = youthQ.data?.id
if (!youthId) {
  const created = await client.database
    .from('youth_profiles')
    .insert([
      {
        user_id: profileQ.data.id,
        preferred_name: 'Mood Test',
        assignment_status: 'pending',
        onboarding_completed: true,
      },
    ])
    .single()
  youthId = created.data?.id
}
console.log('youthId', youthId)

const today = new Date().toISOString().slice(0, 10)
let sessionQ = await client.database
  .from('ai_chat_sessions')
  .select('id')
  .eq('youth_id', youthId)
  .eq('session_date', today)
  .maybeSingle()

if (!sessionQ.data) {
  sessionQ = await client.database
    .from('ai_chat_sessions')
    .insert([{ youth_id: youthId, session_date: today, title: `Chat on ${today}`, risk_level: 'low' }])
    .single()
}
const sessionId = sessionQ.data?.id
console.log('sessionId', sessionId, sessionQ.error?.message)

const invoke = await fetch(`${GATEWAY}/api/v1/ai-chat/invoke`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ action: 'recordMood', sessionId, mood: 'Okay' }),
})
const invokeText = await invoke.text()
console.log('recordMood', invoke.status, invokeText.slice(0, 500))
