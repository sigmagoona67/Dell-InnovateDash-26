import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), '.env.local') })

const GATEWAY = 'http://127.0.0.1:3001'
const email = `youth-white-${Date.now()}@carebridge.test`
const password = 'TestPass123!'

const signup = await fetch(`${GATEWAY}/api/v1/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const signupBody = await signup.json()
if (!signup.ok) {
  console.error('signup failed', signup.status, signupBody)
  process.exit(1)
}

const token = signupBody.accessToken
const patch = await fetch(`${GATEWAY}/api/v1/auth/profile`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'youth', name: 'White Test' }),
})
const patchBody = await patch.json()
console.log('profile patch', patch.status, patchBody.role || patchBody.error)

const prof = await fetch(`${GATEWAY}/api/v1/profile/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'profiles',
    operation: 'select',
    select: '*',
    filters: [{ column: 'auth_user_id', op: 'eq', value: signupBody.user.id }],
    maybeSingle: true,
  }),
})
const profBody = await prof.json()
console.log('profile', prof.status, profBody.data?.role, profBody.error)

const youth = await fetch(`${GATEWAY}/api/v1/profile/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'youth_profiles',
    operation: 'select',
    select: '*',
    filters: [{ column: 'user_id', op: 'eq', value: profBody.data?.id }],
    maybeSingle: true,
  }),
})
const youthBody = await youth.json()
console.log('youth profile', youth.status, youthBody.data?.id || youthBody.error)

const q = await fetch(`${GATEWAY}/api/v1/profile/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'youth_questionnaires',
    operation: 'select',
    select: '*',
    filters: [{ column: 'youth_id', op: 'eq', value: youthBody.data?.id }],
    maybeSingle: true,
  }),
})
const qBody = await q.json()
console.log('questionnaire', q.status, qBody.data ? 'exists' : qBody.error)

console.log('TEST_CREDENTIALS', email, password)
