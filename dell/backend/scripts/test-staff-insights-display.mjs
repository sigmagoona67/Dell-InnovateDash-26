/**
 * Staff profile/insights display smoke test (16514a6 parity).
 */
const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3016'

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  const res = await fetch(`${GATEWAY}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `${res.status} ${path}`)
  return json
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
    }[table] || '/api/v1/profile'
  const res = await fetch(`${GATEWAY}${service}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, operation, ...extra }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `${res.status} ${table}`)
  return json.data
}

async function signup(role, name) {
  const email = `${role}-insights-${Date.now()}@carebridge.test`
  const password = 'TestPass123!'
  const signup = await api('/api/v1/auth/signup', { method: 'POST', body: { email, password } })
  await api('/api/v1/auth/profile', {
    method: 'PATCH',
    token: signup.accessToken,
    body: { role, email, name },
  })
  const profile = await query(signup.accessToken, 'profiles', 'select', {
    filters: [{ column: 'auth_user_id', op: 'eq', value: signup.user.id }],
    maybeSingle: true,
  })
  return { token: signup.accessToken, profile }
}

async function main() {
  const staff = await signup('staff', 'Insights Staff')
  const youth = await signup('youth', 'Insights Youth')
  const yp = await query(youth.token, 'youth_profiles', 'insert', {
    body: {
      user_id: youth.profile.id,
      preferred_name: 'Insights Youth',
      onboarding_completed: true,
      assignment_status: 'pending',
    },
    single: true,
  })

  const q = await query(youth.token, 'youth_questionnaire', 'insert', {
    body: {
      youth_id: yp.id,
      age: 16,
      gender: 'Male',
      country: 'Singapore',
      languages: ['English'],
      interests: ['Mobile Games'],
      personality: [],
      preferred_communication_style: ['Listens without interrupting'],
      living_arrangement: '',
      current_challenges: ['Family conflict'],
      coping_methods: [],
      preferred_worker_gender: 'No Preference',
      preferred_worker_age_range: 'No Preference',
    },
    single: true,
  })

  const sess = await query(youth.token, 'ai_chat_sessions', 'insert', {
    body: { youth_id: yp.id, title: 'insights test', session_date: '2026-06-25' },
    single: true,
  })

  await api('/api/v1/ai-chat/invoke', {
    method: 'POST',
    token: youth.token,
    body: { action: 'sendMessage', sessionId: sess.id, message: 'i want suicide' },
  })

  const sessionAfter = await query(youth.token, 'ai_chat_sessions', 'select', {
    filters: [{ column: 'id', op: 'eq', value: sess.id }],
    maybeSingle: true,
  })

  await query(staff.token, 'youth_profiles', 'update', {
    body: { assigned_staff_id: staff.profile.id, assignment_status: 'assigned' },
    filters: [{ column: 'id', op: 'eq', value: yp.id }],
  })

  const insights = await query(staff.token, 'ai_dynamic_insights', 'select', {
    filters: [{ column: 'youth_id', op: 'eq', value: yp.id }],
    maybeSingle: true,
  })

  const questionnaire = await query(staff.token, 'youth_questionnaire', 'select', {
    filters: [{ column: 'youth_id', op: 'eq', value: yp.id }],
    maybeSingle: true,
  })

  console.log('questionnaire interests:', questionnaire?.interests)
  console.log('questionnaire challenges:', questionnaire?.current_challenges)
  console.log('insights risk:', insights?.risk_level)
  console.log('insights crisis:', insights?.crisis_detected)
  console.log('insights overall_summary:', (insights?.overall_summary || '').slice(0, 120))
  console.log('insights current_state:', insights?.current_state)
  console.log('insights main_risk:', insights?.main_risk)
  console.log('insights dynamic personality:', insights?.dynamic_profile?.personality)
  console.log('insights dynamic living:', insights?.dynamic_profile?.living_arrangement)
  console.log('insights dynamic coping:', insights?.dynamic_profile?.coping_methods)

  console.log('session risk:', sessionAfter?.risk_level, 'crisis:', sessionAfter?.crisis_detected)

  const staffMessages = await query(staff.token, 'ai_messages', 'select', {
    filters: [{ column: 'youth_id', op: 'eq', value: yp.id }],
  })
  console.log('staff-readable messages:', (staffMessages || []).length)

  const issues = []
  if (!questionnaire?.interests?.length) issues.push('questionnaire missing')
  if (sessionAfter?.risk_level !== 'high') issues.push(`session risk not high: ${sessionAfter?.risk_level}`)
  if (!insights?.risk_level || insights.risk_level !== 'high') {
    // saveQuickRiskLevelOnly should create row with high risk after crisis chat
    if (!insights?.risk_level) issues.push('insights row missing after crisis chat')
    else if (insights.risk_level !== 'high') issues.push(`insights risk not high: ${insights.risk_level}`)
  }
  if (!(staffMessages || []).length) issues.push('staff cannot read ai_messages')
  if (!(insights?.current_state || []).length) issues.push('care insights current_state empty')
  if (!(insights?.main_risk || []).length) issues.push('care insights main_risk empty')
  const dynamic = insights?.dynamic_profile || {}
  if (!(dynamic.personality || []).length && !dynamic.living_arrangement && !(dynamic.coping_methods || []).length) {
    issues.push('dynamic youth profile empty')
  }

  if (issues.length) {
    console.error('FAIL:', issues.join(', '))
    process.exit(1)
  }
  console.log('[test-staff-insights] OK')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
