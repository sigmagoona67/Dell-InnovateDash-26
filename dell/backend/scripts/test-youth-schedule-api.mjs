import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), '.env.local') })

const GATEWAY = 'http://127.0.0.1:3001'

const signin = await fetch(`${GATEWAY}/api/v1/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'lifeiwuwu07@gmail.com', password: 'TestPass123!' }),
})
const auth = await signin.json()
if (!auth.accessToken) {
  console.log('signin failed', auth)
  process.exit(1)
}

const prof = await fetch(`${GATEWAY}/api/v1/profile/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'profiles',
    operation: 'select',
    select: 'id',
    filters: [{ column: 'auth_user_id', op: 'eq', value: auth.user.id }],
    maybeSingle: true,
  }),
})
const profBody = await prof.json()
const yp = await fetch(`${GATEWAY}/api/v1/profile/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'youth_profiles',
    operation: 'select',
    select: 'id',
    filters: [{ column: 'user_id', op: 'eq', value: profBody.data.id }],
    maybeSingle: true,
  }),
})
const ypBody = await yp.json()
const youthProfileId = ypBody.data?.id
console.log('youthProfileId', youthProfileId)

const reqRes = await fetch(`${GATEWAY}/api/v1/scheduling/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'consultation_requests',
    operation: 'select',
    select: '*',
    filters: [{ column: 'youth_id', op: 'eq', value: youthProfileId }],
    order: { column: 'created_at', ascending: false },
  }),
})
const reqBody = await reqRes.json()
console.log('status', reqRes.status)
console.log('requests', JSON.stringify(reqBody.data, null, 2))
