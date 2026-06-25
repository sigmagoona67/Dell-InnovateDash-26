/**
 * Verify one-email-one-role enforcement on auth API.
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:3001/api/v1/auth'

async function req(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

const staffEmail = 'lifeiwuwu02@gmail.com'
const staffPassword = process.env.TEST_STAFF_PASSWORD || 'password123'

const signin = await req('/signin', { email: staffEmail, password: staffPassword })
if (signin.status !== 200) {
  console.error('Staff signin failed — set TEST_STAFF_PASSWORD or use known credentials.', signin)
  process.exit(1)
}

const token = signin.json.accessToken
const role = signin.json.user?.profile?.role
console.log('Staff signed in, role:', role)

const patch = await fetch(`${BASE}/profile`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ role: 'youth', email: staffEmail, name: 'lifeiwuwu02' }),
})
const patchJson = await patch.json()
console.log('PATCH role youth →', patch.status, patchJson.error || 'OK')

const signup = await req('/signup', { email: staffEmail, password: 'otherpass' })
console.log('Signup duplicate →', signup.status, signup.json.error || 'OK')

const youthSignin = await req('/signin', { email: staffEmail, password: staffPassword })
const youthPortalAttempt = youthSignin.json.user?.profile?.role
console.log('Role after blocked patch:', youthPortalAttempt)

if (patch.status === 403 && String(patchJson.error).includes('Role mismatch')) {
  console.log('PASS: backend blocks role change')
} else {
  console.log('FAIL: expected 403 role mismatch on PATCH')
  process.exit(1)
}

if (signup.status === 409) {
  console.log('PASS: duplicate signup returns 409')
} else {
  console.log('FAIL: expected 409 on duplicate signup')
  process.exit(1)
}

console.log('All role enforcement checks passed.')
