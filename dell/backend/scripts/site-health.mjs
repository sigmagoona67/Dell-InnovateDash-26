/**
 * Site health check — mirrors 16514a6 critical API flows.
 */
const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3001'

const checks = []
function pass(name) {
  checks.push({ name, ok: true })
  console.log(`  OK ${name}`)
}
function fail(name, err) {
  checks.push({ name, ok: false, err: err.message })
  console.error(`  FAIL ${name}: ${err.message}`)
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  const res = await fetch(`${GATEWAY}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `${res.status}`)
  return json
}

async function query(token, table, operation, extra = {}) {
  const service =
    {
      profiles: '/api/v1/profile',
      youth_profiles: '/api/v1/profile',
      staff_profiles: '/api/v1/profile',
      consultation_requests: '/api/v1/scheduling',
      ai_chat_sessions: '/api/v1/ai-chat',
    }[table] || '/api/v1/profile'

  const res = await fetch(`${GATEWAY}${service}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, operation, ...extra }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `${res.status}`)
  return json.data
}

async function signup(role, name) {
  const email = `${role}-health-${Date.now()}@carebridge.test`
  const password = 'TestPass123!'
  const signup = await api('/api/v1/auth/signup', { method: 'POST', body: { email, password } })
  const profile = await api('/api/v1/auth/profile', {
    method: 'PATCH',
    token: signup.accessToken,
    body: { role, email, name },
  })
  const token = profile.accessToken || signup.accessToken
  const userId = profile.user?.id || signup.user?.id
  const appProfile = await query(token, 'profiles', 'select', {
    filters: [{ column: 'auth_user_id', op: 'eq', value: userId }],
    maybeSingle: true,
  })
  return { token, profile: appProfile }
}

async function main() {
  console.log('[site-health]', GATEWAY)
  const health = await fetch(`${GATEWAY}/health`)
  if (!health.ok) throw new Error('gateway down')
  pass('gateway')

  const staff = await signup('staff', 'Health Staff')
  await query(staff.token, 'staff_profiles', 'insert', {
    body: { profile_id: staff.profile.id, questionnaire_completed: true },
    single: true,
  })
  pass('staff signup')

  const youth = await signup('youth', 'Health Youth')
  const youthRow = await query(youth.token, 'youth_profiles', 'insert', {
    body: {
      user_id: youth.profile.id,
      preferred_name: 'Health Youth',
      onboarding_completed: true,
      assignment_status: 'pending',
    },
    single: true,
  })
  pass('youth signup')

  const assigned = await query(staff.token, 'youth_profiles', 'update', {
    body: { assigned_staff_id: staff.profile.id, assignment_status: 'assigned' },
    filters: [
      { column: 'id', op: 'eq', value: youthRow.id },
      { column: 'assigned_staff_id', op: 'is', value: null },
    ],
    maybeSingle: true,
  })
  if (!assigned?.assigned_staff_id) throw new Error('claim failed')
  const youthRead = await query(youth.token, 'youth_profiles', 'select', {
    filters: [{ column: 'id', op: 'eq', value: youthRow.id }],
    single: true,
  })
  if (youthRead.assigned_staff_id !== staff.profile.id) throw new Error('youth read mismatch')
  pass('claim sync')

  const req = await query(youth.token, 'consultation_requests', 'insert', {
    body: {
      youth_id: youthRow.id,
      staff_id: staff.profile.id,
      slot_date: '2026-06-25',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'pending',
      initiated_by: 'youth',
    },
    single: true,
  })
  if (req.slot_date !== '2026-06-25') throw new Error(`slot_date ${req.slot_date}`)
  pass('schedule date format')

  await query(youth.token, 'ai_chat_sessions', 'insert', {
    body: { youth_id: youthRow.id, title: 'Health check', session_date: '2026-06-25' },
    single: true,
  })
  pass('ai chat session')

  const sessions = await query(youth.token, 'ai_chat_sessions', 'select', {
    filters: [{ column: 'youth_id', op: 'eq', value: youthRow.id }],
    limit: 1,
    maybeSingle: true,
  })
  const invokeRes = await fetch(`${GATEWAY}/api/v1/ai-chat/invoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${youth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sendMessage',
      sessionId: sessions.id,
      message: "I'm feeling okay today.",
    }),
  })
  const invokeJson = await invokeRes.json()
  if (!invokeRes.ok || (!invokeJson.reply && !invokeJson.data?.reply)) {
    throw new Error(invokeJson.error || 'ai invoke failed')
  }
  pass('ai chat invoke')

  console.log(`[site-health] ${checks.length}/${checks.length} passed`)
}

main().catch((err) => {
  console.error('[site-health] FAIL:', err.message)
  process.exit(1)
})
