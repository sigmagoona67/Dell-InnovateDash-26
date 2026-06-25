import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({
  path: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), '.env.local'),
})

const GATEWAY = 'http://127.0.0.1:3001'

async function signIn(email, password) {
  const res = await fetch(`${GATEWAY}/api/v1/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`signin ${email}: ${body.error}`)
  return body
}

async function query(token, payload) {
  const res = await fetch(`${GATEWAY}/api/v1/scheduling/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `query failed ${res.status}`)
  return body.data
}

const staff = await signIn('lifeiwuwu06@gmail.com', 'TestPass123!')
const staffProfile = await fetch(`${GATEWAY}/api/v1/profile/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${staff.accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'profiles',
    operation: 'select',
    select: 'id',
    filters: [{ column: 'auth_user_id', op: 'eq', value: staff.user.id }],
    maybeSingle: true,
  }),
}).then((r) => r.json())

const staffId = staffProfile.data?.id
const pending = await query(staff.accessToken, {
  table: 'consultation_requests',
  operation: 'select',
  select: '*',
  filters: [
    { column: 'staff_id', op: 'eq', value: staffId },
    { column: 'status', op: 'eq', value: 'pending' },
    { column: 'initiated_by', op: 'eq', value: 'youth' },
  ],
  order: { column: 'created_at', ascending: false },
  limit: 1,
})

const request = Array.isArray(pending) ? pending[0] : pending
if (!request?.id) {
  console.log('No pending youth consultation request found for staff 06')
  process.exit(0)
}

console.log('Pending request:', request.id, request.slot_date, request.start_time)

const slot = await query(staff.accessToken, {
  table: 'staff_schedule_slots',
  operation: 'upsert',
  upsert: 'staff_id,slot_date,start_time',
  body: {
    staff_id: request.staff_id,
    slot_date: request.slot_date,
    start_time: request.start_time,
    end_time: request.end_time,
    status: 'booked',
    youth_id: request.youth_id,
    notes: null,
  },
  single: true,
})
console.log('Upsert slot:', slot?.id, slot?.status)

const accepted = await query(staff.accessToken, {
  table: 'consultation_requests',
  operation: 'update',
  body: { status: 'accepted', staff_slot_id: slot?.id || null },
  filters: [
    { column: 'id', op: 'eq', value: request.id },
    { column: 'status', op: 'eq', value: 'pending' },
  ],
  single: true,
})
console.log('Accepted:', accepted?.status)
console.log('PASS')
