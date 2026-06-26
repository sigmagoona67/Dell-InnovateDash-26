const GATEWAY = 'http://127.0.0.1:3001'

async function authYouth() {
  const email = `piano-prof-${Date.now()}@carebridge.test`
  const password = 'TestPass123!'
  const sj = await (await fetch(`${GATEWAY}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })).json()
  const pj = await (await fetch(`${GATEWAY}/api/v1/auth/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sj.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'youth', email, name: 'Piano Prof' }),
  })).json()
  const token = pj.accessToken || sj.accessToken
  const userId = pj.user?.id || sj.user?.id
  const { createClient } = await import('../lib/createClient.js')
  const client = createClient({ edgeFunctionToken: token })
  const { data: profile } = await client.database.from('profiles').select('id').eq('auth_user_id', userId).maybeSingle()
  const profileId = profile?.id || (await client.database.from('profiles').insert([{ auth_user_id: userId, email, role: 'youth', display_name: 'Piano Prof' }]).select('id').single()).data?.id
  const { data: youth } = await client.database.from('youth_profiles').insert([{ user_id: profileId, preferred_name: 'Piano Prof', assignment_status: 'pending', onboarding_completed: true }]).single()
  const today = new Date().toISOString().slice(0, 10)
  const { data: session } = await client.database.from('ai_chat_sessions').insert([{ youth_id: youth.id, session_date: today, title: 't', risk_level: 'low' }]).single()
  return { token, sessionId: session.id, youthId: youth.id, client }
}

async function invoke(token, body) {
  const res = await fetch(`${GATEWAY}/api/v1/ai-chat/invoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

const { token, sessionId, youthId, client } = await authYouth()
await invoke(token, { action: 'recordMood', sessionId, mood: 'Sad' })
const chat = await invoke(token, { action: 'sendMessage', sessionId, message: 'ilike piano' })
if (chat.status !== 200) {
  console.error('chat failed', chat.body)
  process.exit(1)
}

await new Promise((r) => setTimeout(r, 2000))

const { data: insights } = await client.database.from('ai_dynamic_insights').select('dynamic_profile, current_state, main_risk, latest_change').eq('youth_id', youthId).maybeSingle()
const interests = insights?.dynamic_profile?.interests || []
const hasPiano = interests.some((i) => /piano|music/i.test(String(i)))
const crisisCare = (insights?.current_state || []).some((t) => /suicidal/i.test(String(t)))

if (!hasPiano) {
  console.error('FAIL: dynamic_profile interests missing piano:', interests, insights)
  process.exit(1)
}
if (crisisCare) {
  console.error('FAIL: care insights still show crisis for casual piano message:', insights)
  process.exit(1)
}

console.log('PASS profile regen after ilike piano')
console.log('interests:', interests)
console.log('latest_change:', insights?.latest_change)
