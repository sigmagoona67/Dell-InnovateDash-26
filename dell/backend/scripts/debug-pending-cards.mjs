/**
 * Debug why staff pending youth card build fails.
 * Run: node scripts/debug-pending-cards.mjs
 */
const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3001'

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${GATEWAY}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function query(token, table, operation, extra = {}) {
  const service =
    {
      profiles: '/api/v1/profile',
      youth_profiles: '/api/v1/profile',
      youth_questionnaire: '/api/v1/onboarding',
      ai_chat_sessions: '/api/v1/ai-chat',
      ai_messages: '/api/v1/ai-chat',
      ai_dynamic_insights: '/api/v1/ai-insights',
      offline_counselling_sessions: '/api/v1/offline',
      staff_youth_views: '/api/v1/case',
      consultation_requests: '/api/v1/scheduling',
    }[table] || '/api/v1/profile'

  const res = await fetch(`${GATEWAY}${service}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, operation, ...extra }),
  })
  const json = await res.json()
  return { ok: res.ok, status: res.status, json }
}

async function main() {
  const email = `staff-debug-${Date.now()}@carebridge.test`
  const signup = await api('/api/v1/auth/signup', {
    method: 'POST',
    body: { email, password: 'TestPass123!' },
  })
  if (!signup.ok) throw new Error(`signup failed: ${signup.json.error}`)
  const profile = await api('/api/v1/auth/profile', {
    method: 'PATCH',
    token: signup.json.accessToken,
    body: { role: 'staff', email, name: 'Debug Staff' },
  })
  const token = profile.json.accessToken || signup.json.accessToken

  const pending = await query(token, 'youth_profiles', 'select', {
    filters: [{ column: 'assigned_staff_id', op: 'is', value: null }],
  })
  console.log('pending youth count:', pending.json.data?.length ?? 0)
  const youthIds = (pending.json.data || []).map((r) => r.id)
  const userIds = (pending.json.data || []).map((r) => r.user_id)
  if (!youthIds.length) {
    console.log('No pending youth in DB — create youth accounts first')
    return
  }

  const tests = [
    ['profiles.in', 'profiles', { select: 'id, display_name, email', filters: [{ column: 'id', op: 'in', value: userIds }] }],
    ['youth_questionnaire.in', 'youth_questionnaire', { select: '*', filters: [{ column: 'youth_id', op: 'in', value: youthIds }] }],
    ['ai_chat_sessions.in', 'ai_chat_sessions', { select: '*', filters: [{ column: 'youth_id', op: 'in', value: youthIds }] }],
    ['ai_dynamic_insights.in', 'ai_dynamic_insights', { select: '*', filters: [{ column: 'youth_id', op: 'in', value: youthIds }] }],
    ['ai_messages.in+order', 'ai_messages', {
      select: 'youth_id, sender, message, created_at',
      filters: [{ column: 'youth_id', op: 'in', value: youthIds }],
      order: { column: 'created_at', ascending: true },
    }],
    ['offline.in+eq', 'offline_counselling_sessions', {
      select: '*',
      filters: [
        { column: 'youth_id', op: 'in', value: youthIds },
        { column: 'status', op: 'eq', value: 'approved' },
      ],
    }],
    ['staff_youth_views.in', 'staff_youth_views', {
      select: '*',
      filters: [
        { column: 'staff_id', op: 'eq', value: userIds[0] },
        { column: 'youth_id', op: 'in', value: youthIds },
      ],
    }],
    ['consultation_requests', 'consultation_requests', {
      select: '*',
      filters: [{ column: 'staff_id', op: 'eq', value: userIds[0] }],
      order: { column: 'slot_date', ascending: true },
    }],
  ]

  for (const [label, table, payload] of tests) {
    const result = await query(token, table, 'select', payload)
    if (!result.ok) {
      console.error(`FAIL ${label}:`, result.status, result.json.error || result.json)
    } else {
      const count = Array.isArray(result.json.data) ? result.json.data.length : result.json.data ? 1 : 0
      console.log(`OK   ${label}: ${count} rows`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
