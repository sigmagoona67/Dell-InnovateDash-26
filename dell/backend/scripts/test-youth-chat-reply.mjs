/**
 * Test youth sendMessage reply quality (model + replySource).
 */
const GATEWAY = 'http://127.0.0.1:3001'

async function authYouth() {
  const email = `chat-test-${Date.now()}@carebridge.test`
  const password = 'TestPass123!'
  const signup = await fetch(`${GATEWAY}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const sj = await signup.json()
  const patch = await fetch(`${GATEWAY}/api/v1/auth/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sj.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'youth', email, name: 'Chat Test' }),
  })
  const pj = await patch.json()
  const token = pj.accessToken || sj.accessToken
  const userId = pj.user?.id || sj.user?.id

  const { createClient } = await import('../lib/createClient.js')
  const client = createClient({ edgeFunctionToken: token })
  const profile = await client.database.from('profiles').select('id').eq('auth_user_id', userId).maybeSingle()
  const youth = await client.database
    .from('youth_profiles')
    .insert([
      {
        user_id: profile.data.id,
        preferred_name: 'Chat Test',
        assignment_status: 'pending',
        onboarding_completed: true,
      },
    ])
    .single()
  const today = new Date().toISOString().slice(0, 10)
  const session = await client.database
    .from('ai_chat_sessions')
    .insert([{ youth_id: youth.data.id, session_date: today, title: 't', risk_level: 'low' }])
    .single()

  return { token, sessionId: session.data.id }
}

const { token, sessionId } = await authYouth()
const msg =
  'School was really loud today and kids kept clicking pens. I felt irritated and sad. My parents do not understand why I need quiet.'

const res = await fetch(`${GATEWAY}/api/v1/ai-chat/invoke`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'sendMessage', sessionId, message: msg }),
})
const body = await res.json()
console.log('status', res.status)
console.log('model', body.model)
console.log('replySource', body.replySource)
console.log('reply preview', String(body.reply || '').slice(0, 300))
console.log('has bullets', /•/.test(body.reply || ''))
