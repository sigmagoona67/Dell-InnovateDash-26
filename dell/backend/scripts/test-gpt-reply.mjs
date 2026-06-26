/**
 * Verify youth chat uses GPT (OpenRouter), not local fallback.
 */
const GATEWAY = 'http://127.0.0.1:3001'

async function authYouth() {
  const email = `gpt-test-${Date.now()}@carebridge.test`
  const password = 'TestPass123!'
  const sj = await (await fetch(`${GATEWAY}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })).json()
  const pj = await (await fetch(`${GATEWAY}/api/v1/auth/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sj.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'youth', email, name: 'GPT Test' }),
  })).json()
  const token = pj.accessToken || sj.accessToken
  const userId = pj.user?.id || sj.user?.id
  const { createClient } = await import('../lib/createClient.js')
  const client = createClient({ edgeFunctionToken: token })
  const { data: profile } = await client.database.from('profiles').select('id').eq('auth_user_id', userId).maybeSingle()
  const profileId = profile?.id || (await client.database.from('profiles').insert([{ auth_user_id: userId, email, role: 'youth', display_name: 'GPT Test' }]).select('id').single()).data?.id
  const { data: youth } = await client.database.from('youth_profiles').insert([{ user_id: profileId, preferred_name: 'GPT Test', assignment_status: 'pending', onboarding_completed: true }]).single()
  const today = new Date().toISOString().slice(0, 10)
  const { data: session } = await client.database.from('ai_chat_sessions').insert([{ youth_id: youth.id, session_date: today, title: 't', risk_level: 'low' }]).single()
  return { token, sessionId: session.id }
}

async function invoke(token, body) {
  const res = await fetch(`${GATEWAY}/api/v1/ai-chat/invoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

const { token, sessionId } = await authYouth()
await invoke(token, { action: 'recordMood', sessionId, mood: 'Sad' })
const chat = await invoke(token, { action: 'sendMessage', sessionId, message: 'ilike piano' })

if (chat.status !== 200) {
  console.error('FAIL status', chat.status, chat.body)
  process.exit(1)
}
if (chat.body.replySource !== 'chatgpt') {
  console.error('FAIL: expected replySource=chatgpt, got', chat.body.replySource, 'model=', chat.body.model)
  console.error('reply:', String(chat.body.reply).slice(0, 200))
  process.exit(1)
}
if (String(chat.body.reply).includes('feeling sad today')) {
  console.error('FAIL: still using sad template')
  process.exit(1)
}

console.log('PASS GPT reply via OpenRouter')
console.log('model:', chat.body.model)
console.log('replySource:', chat.body.replySource)
console.log('reply preview:', String(chat.body.reply).slice(0, 180))
