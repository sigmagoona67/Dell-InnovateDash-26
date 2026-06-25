/**
 * Full-site API smoke test — youth + staff critical paths.
 * Usage: CAREBRIDGE_API_URL=http://localhost:3001 node scripts/full-site-test.mjs
 */
const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3001'
const results = []

function pass(name) {
  results.push({ name, ok: true })
  console.log(`  OK  ${name}`)
}
function fail(name, err) {
  results.push({ name, ok: false, err: err.message })
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
  if (!res.ok) throw new Error(json.error || `${res.status} ${path}`)
  return json
}

async function query(token, table, operation, extra = {}) {
  const service =
    {
      profiles: '/api/v1/profile',
      youth_profiles: '/api/v1/profile',
      staff_profiles: '/api/v1/profile',
      youth_questionnaire: '/api/v1/onboarding',
      staff_questionnaire: '/api/v1/onboarding',
      assigned_workers: '/api/v1/case',
      reassignment_requests: '/api/v1/reassignment',
      consultation_requests: '/api/v1/scheduling',
      ai_chat_sessions: '/api/v1/ai-chat',
      ai_messages: '/api/v1/ai-chat',
      ai_dynamic_insights: '/api/v1/ai-insights',
      offline_counselling_sessions: '/api/v1/offline',
      staff_schedule_slots: '/api/v1/scheduling',
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
  const email = `${role}-full-${Date.now()}@carebridge.test`
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
  return { token, email, profile: appProfile }
}

async function main() {
  console.log('[full-site-test]', GATEWAY)

  try {
    const health = await fetch(`${GATEWAY}/health`)
    if (!health.ok) throw new Error('gateway down')
    pass('gateway health')
  } catch (e) {
    fail('gateway health', e)
    throw e
  }

  let staff, youth
  try {
    staff = await signup('staff', 'Full Test Staff')
    pass('staff signup + profile')
  } catch (e) {
    fail('staff signup + profile', e)
  }

  try {
    youth = await signup('youth', 'Full Test Youth')
    pass('youth signup + profile')
  } catch (e) {
    fail('youth signup + profile', e)
  }

  if (youth) {
    try {
      const youthRow = await query(youth.token, 'youth_profiles', 'insert', {
        body: {
          user_id: youth.profile.id,
          preferred_name: 'Full Test Youth',
          onboarding_completed: true,
          assignment_status: 'pending',
        },
        single: true,
      })
      pass('youth profile create')
      youth.youthRow = youthRow
    } catch (e) {
      fail('youth profile create', e)
    }
  }

  if (staff && youth?.youthRow) {
    try {
      await query(staff.token, 'assigned_workers', 'insert', {
        body: { youth_id: youth.youthRow.id, staff_id: staff.profile.id, status: 'active' },
        single: true,
      })
      pass('staff assign youth')
    } catch (e) {
      fail('staff assign youth', e)
    }
  }

  if (youth?.youthRow) {
    try {
      await query(youth.token, 'consultation_requests', 'insert', {
        body: {
          youth_id: youth.youthRow.id,
          staff_id: staff?.profile?.id,
          slot_date: '2026-06-25',
          start_time: '10:00:00',
          end_time: '11:00:00',
          status: 'pending',
          initiated_by: 'youth',
        },
        single: true,
      })
      pass('youth schedule request')
    } catch (e) {
      fail('youth schedule request', e)
    }
  }

  if (youth?.youthRow) {
    try {
      const session = await query(youth.token, 'ai_chat_sessions', 'insert', {
        body: {
          youth_id: youth.youthRow.id,
          title: 'Full test chat',
          session_date: '2026-06-25',
        },
        single: true,
      })
      await query(youth.token, 'ai_messages', 'insert', {
        body: {
          session_id: session.id,
          youth_id: youth.youthRow.id,
          sender: 'youth',
          message: "I'm feeling okay today.",
        },
        single: true,
      })
      pass('ai chat session + message')
    } catch (e) {
      fail('ai chat session + message', e)
    }
  }

  if (youth?.token && youth?.youthRow) {
    try {
      const session = await query(youth.token, 'ai_chat_sessions', 'select', {
        filters: [{ column: 'youth_id', op: 'eq', value: youth.youthRow.id }],
        order: { column: 'created_at', ascending: false },
        limit: 1,
        maybeSingle: true,
      })
      let sessionId = session?.id
      if (!sessionId) {
        const created = await query(youth.token, 'ai_chat_sessions', 'insert', {
          body: {
            youth_id: youth.youthRow.id,
            title: 'Full test chat',
            session_date: '2026-06-25',
          },
          single: true,
        })
        sessionId = created.id
      }
      const invoke = await api('/api/v1/ai-chat/invoke', {
        method: 'POST',
        token: youth.token,
        body: {
          action: 'sendMessage',
          sessionId,
          message: "I'm feeling okay today.",
        },
      })
      if (!invoke?.reply && !invoke?.data?.reply) {
        throw new Error(`no reply: ${JSON.stringify(invoke).slice(0, 180)}`)
      }
      pass('ai-chat invoke (youth companion)')
    } catch (e) {
      fail('ai-chat invoke (youth companion)', e)
    }
  }

  if (youth?.youthRow && staff?.token) {
    try {
      await query(youth.token, 'reassignment_requests', 'insert', {
        body: {
          youth_id: youth.youthRow.id,
          requested_by: 'youth',
          requester_profile_id: youth.profile.id,
          assigned_staff_id: staff.profile.id,
          reason: 'Full site test',
          status: 'pending',
        },
        single: true,
      })
      pass('reassignment request')
    } catch (e) {
      fail('reassignment request', e)
    }
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n[full-site-test] ${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[full-site-test] aborted:', err.message)
  process.exit(1)
})
