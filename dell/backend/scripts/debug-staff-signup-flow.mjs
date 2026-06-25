/**
 * Simulate frontend signUpWithRole staff flow
 */
const email = `staff-test-${Date.now()}@carebridge.test`
const password = 'TestPass123!'
const name = 'Lifei05'
const role = 'staff'

async function authFetch(path, options = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`http://127.0.0.1:3001${path}`, { ...options, headers })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { data: null, error: { message: json.error || 'Request failed', status: response.status } }
  }
  return { data: json, error: null }
}

const signup = await authFetch('/api/v1/auth/signup', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
})
console.log('1 signup', signup.error || 'ok', signup.data?.user?.id)

if (signup.error) process.exit(1)

let token = signup.data.accessToken
const patch = await authFetch(
  '/api/v1/auth/profile',
  { method: 'PATCH', body: JSON.stringify({ role, email, name }) },
  token,
)
console.log('2 setProfile', patch.error || 'ok', patch.data?.user?.profile)
if (patch.error) {
  console.log('FAIL at setProfile')
  process.exit(1)
}
token = patch.data.accessToken || token

const profileQuery = await authFetch(
  '/api/v1/profile/query',
  {
    method: 'POST',
    body: JSON.stringify({
      table: 'profiles',
      operation: 'select',
      select: '*',
      filters: [{ column: 'auth_user_id', op: 'eq', value: signup.data.user.id }],
      maybeSingle: true,
    }),
  },
  token,
)
console.log('3 findProfile', profileQuery.error || profileQuery.data)

const insertProfile = await authFetch(
  '/api/v1/profile/query',
  {
    method: 'POST',
    body: JSON.stringify({
      table: 'profiles',
      operation: 'insert',
      body: { auth_user_id: signup.data.user.id, email, role, display_name: name },
      single: true,
    }),
  },
  token,
)
console.log('4 createProfile (if needed)', insertProfile.error || insertProfile.data)

const staffInsert = await authFetch(
  '/api/v1/profile/query',
  {
    method: 'POST',
    body: JSON.stringify({
      table: 'staff_profiles',
      operation: 'insert',
      body: { profile_id: profileQuery.data?.id, questionnaire_completed: false },
      single: true,
    }),
  },
  token,
)
console.log('5 staff_profiles', staffInsert.error || 'ok')

console.log('DONE', email)
