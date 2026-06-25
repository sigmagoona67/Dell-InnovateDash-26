/**
 * E2E: staff claims youth → youth bootstrap sees assigned worker.
 * Run with backend up: cd backend && npm run start:all
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
      assigned_workers: '/api/v1/case',
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
        body: { profile_id: appProfile.id, questionnaire_completed: true },
        single: true,
      })
    } else {
      await query(token, 'staff_profiles', 'update', {
        body: { questionnaire_completed: true },
        filters: [{ column: 'profile_id', op: 'eq', value: appProfile.id }],
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
          onboarding_completed: true,
        },
        single: true,
      })
    } else {
      await query(token, 'youth_profiles', 'update', {
        body: { onboarding_completed: true, assignment_status: 'pending', assigned_staff_id: null },
        filters: [{ column: 'user_id', op: 'eq', value: appProfile.id }],
        single: true,
      })
    }
  }

  return { token, profile: appProfile, userId }
}

async function assignYouthToStaff(staffToken, staffProfileId, youthId) {
  const updated = await query(staffToken, 'youth_profiles', 'update', {
    body: {
      assigned_staff_id: staffProfileId,
      assignment_status: 'assigned',
    },
    filters: [
      { column: 'id', op: 'eq', value: youthId },
      { column: 'assigned_staff_id', op: 'is', value: null },
    ],
    maybeSingle: true,
  })
  if (!updated?.id) throw new Error('assign youth_profiles update returned no row')
  return updated
}

async function readYouthAssignment(youthToken, youthProfileId) {
  return query(youthToken, 'youth_profiles', 'select', {
    select: 'id, assigned_staff_id, assignment_status, preferred_name',
    filters: [{ column: 'id', op: 'eq', value: youthProfileId }],
    single: true,
  })
}

async function readStaffProfile(youthToken, staffProfileId) {
  return query(youthToken, 'profiles', 'select', {
    select: 'id, display_name, email',
    filters: [{ column: 'id', op: 'eq', value: staffProfileId }],
    maybeSingle: true,
  })
}

async function main() {
  const health = await fetch(`${GATEWAY}/health`)
  if (!health.ok) throw new Error('Gateway not running. Run: cd backend && npm run start:all')

  const ts = Date.now()
  const staffEmail = `staff-assign-${ts}@carebridge.test`
  const youthEmail = `youth-assign-${ts}@carebridge.test`

  console.log('[assign-e2e] signup staff + youth...')
  const staff = await signupWithRole(staffEmail, 'TestPass123!', 'staff', 'Lifei06')
  const youth = await signupWithRole(youthEmail, 'TestPass123!', 'youth', 'Lifei01')

  const youthRow = await query(youth.token, 'youth_profiles', 'select', {
    filters: [{ column: 'user_id', op: 'eq', value: youth.profile.id }],
    single: true,
  })

  const before = await readYouthAssignment(youth.token, youthRow.id)
  if (before.assigned_staff_id) throw new Error('youth should start unassigned')

  console.log('[assign-e2e] staff claims youth...')
  const assigned = await assignYouthToStaff(staff.token, staff.profile.id, youthRow.id)
  if (assigned.assigned_staff_id !== staff.profile.id) {
    throw new Error('assigned_staff_id mismatch after claim')
  }
  if (assigned.assignment_status !== 'assigned') {
    throw new Error(`expected assignment_status=assigned, got ${assigned.assignment_status}`)
  }

  const after = await readYouthAssignment(youth.token, youthRow.id)
  if (after.assigned_staff_id !== staff.profile.id) {
    throw new Error('youth cannot read assigned_staff_id after claim')
  }

  const staffView = await readStaffProfile(youth.token, staff.profile.id)
  if (!staffView?.display_name) {
    throw new Error('youth cannot read assigned staff profile')
  }

  console.log('[assign-e2e] PASS')
  console.log(`  staff: ${staffEmail} (${staffView.display_name})`)
  console.log(`  youth: ${youthEmail} → assigned to ${after.assigned_staff_id}`)
}

main().catch((err) => {
  console.error('[assign-e2e] FAIL:', err.message)
  process.exit(1)
})
