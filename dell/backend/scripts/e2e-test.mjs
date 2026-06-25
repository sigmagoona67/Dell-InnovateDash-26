/**
 * End-to-end API test: staff signup + questionnaire, youth signup + profile.
 * Run with backend up: npm run start:all
 */
const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3001'

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${json.error || res.status}`)
  return json
}

async function query(token, table, operation, extra = {}) {
  const service =
    {
      profiles: '/api/v1/profile',
      youth_profiles: '/api/v1/profile',
      staff_profiles: '/api/v1/profile',
      staff_questionnaire: '/api/v1/onboarding',
      youth_questionnaire: '/api/v1/onboarding',
    }[table] || '/api/v1/profile'

  const res = await fetch(`${GATEWAY}${service}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, operation, ...extra }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`query ${table}.${operation} → ${json.error}`)
  return json.data
}

async function signupWithRole(email, password, role, name) {
  const signup = await api('/api/v1/auth/signup', {
    method: 'POST',
    body: { email, password },
  })
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
  if (!appProfile) throw new Error('profiles row missing after signup')

  if (role === 'staff') {
    const existing = await query(token, 'staff_profiles', 'select', {
      filters: [{ column: 'profile_id', op: 'eq', value: appProfile.id }],
      maybeSingle: true,
    })
    if (!existing) {
      await query(token, 'staff_profiles', 'insert', {
        body: { profile_id: appProfile.id, questionnaire_completed: false },
        single: true,
      })
    }
  }

  if (role === 'youth') {
    const existing = await query(token, 'youth_profiles', 'select', {
      filters: [{ column: 'user_id', op: 'eq', value: appProfile.id }],
      maybeSingle: true,
    })
    if (!existing) {
      await query(token, 'youth_profiles', 'insert', {
        body: {
          user_id: appProfile.id,
          preferred_name: name,
          assignment_status: 'pending',
          onboarding_completed: false,
        },
        single: true,
      })
    }
  }

  return { token, profile: appProfile, userId }
}

async function testStaffQuestionnaire(token, staffProfileId) {
  const payload = {
    staff_id: staffProfileId,
    date_of_birth: '1990-05-15',
    age: 35,
    gender: 'Female',
    country: 'Australia',
    languages: ['English', 'Mandarin'],
    interests: ['Family conflict'],
    preferred_communication_style: ['Patient listener'],
    supporting_strengths: ['Anxiety', 'Stress'],
    personality: [],
    questionnaire_version: 2,
    quiz_completed: true,
  }

  const saved = await query(token, 'staff_questionnaire', 'insert', {
    body: payload,
    single: true,
  })
  if (!saved?.id) throw new Error('staff_questionnaire insert failed')
  if (!Array.isArray(saved.interests) && typeof saved.interests !== 'object') {
    throw new Error('interests not stored as json')
  }

  await query(token, 'staff_profiles', 'update', {
    body: { questionnaire_completed: true },
    filters: [{ column: 'profile_id', op: 'eq', value: staffProfileId }],
    single: true,
  })

  const reread = await query(token, 'staff_questionnaire', 'select', {
    filters: [{ column: 'staff_id', op: 'eq', value: staffProfileId }],
    single: true,
  })
  const staffRecord = await query(token, 'staff_profiles', 'select', {
    filters: [{ column: 'profile_id', op: 'eq', value: staffProfileId }],
    single: true,
  })
  if (!staffRecord?.questionnaire_completed) throw new Error('staff questionnaire_completed not persisted')
  if ((reread?.questionnaire_version ?? 0) < 2) throw new Error('staff questionnaire_version not persisted')
  if (!Array.isArray(reread?.interests) || !reread.interests.length) {
    throw new Error('staff interests not persisted')
  }

  console.log('[e2e] staff questionnaire OK')
}

async function testYouthQuestionnaire(token, youthProfileId) {
  const payload = {
    youth_id: youthProfileId,
    interests: ['Music', 'Sports'],
    personality: ['Quiet'],
    preferred_communication_style: ['Text chat'],
    living_arrangement: 'With family',
    current_challenges: ['School stress'],
    coping_methods: ['Walking'],
    languages: ['English'],
    questionnaire_version: 2,
  }

  const saved = await query(token, 'youth_questionnaire', 'insert', {
    body: payload,
    single: true,
  })
  if (!saved?.id) throw new Error('youth_questionnaire insert failed')
  console.log('[e2e] youth questionnaire OK')
}

async function main() {
  const health = await fetch(`${GATEWAY}/health`)
  if (!health.ok) throw new Error('Gateway not running. Run: npm run start:all')

  const ts = Date.now()
  const staffEmail = `staff-e2e-${ts}@carebridge.test`
  const youthEmail = `youth-e2e-${ts}@carebridge.test`

  console.log('[e2e] staff signup...')
  const staff = await signupWithRole(staffEmail, 'TestPass123!', 'staff', 'E2E Staff')
  await testStaffQuestionnaire(staff.token, staff.profile.id)

  console.log('[e2e] youth signup...')
  const youth = await signupWithRole(youthEmail, 'TestPass123!', 'youth', 'E2E Youth')
  const youthProfile = await query(youth.token, 'youth_profiles', 'select', {
    filters: [{ column: 'user_id', op: 'eq', value: youth.profile.id }],
    maybeSingle: true,
  })
  await testYouthQuestionnaire(youth.token, youthProfile.id)

  console.log('[e2e] PASS — staff + youth signup and questionnaires')
  console.log(`  staff: ${staffEmail}`)
  console.log(`  youth: ${youthEmail}`)
}

main().catch((err) => {
  console.error('[e2e] FAIL:', err.message)
  process.exit(1)
})
