import bcrypt from 'bcryptjs'
import pg from 'pg'

const email = process.argv[2] || 'lifeiwuwu06@gmail.com'
const password = process.argv[3] || 'TestPass123!'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})

const hash = await bcrypt.hash(password, 10)
const { rows } = await pool.query(
  `UPDATE public.auth_users SET password_hash = $1 WHERE lower(email) = lower($2) RETURNING id, email`,
  [hash, email],
)
console.log('password reset', rows[0] || 'not found')

const GATEWAY = 'http://127.0.0.1:3001'
const signin = await fetch(`${GATEWAY}/api/v1/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const body = await signin.json()
console.log('signin', signin.status, body.error || body.user?.profile)

const prof = await fetch(`${GATEWAY}/api/v1/profile/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${body.accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    table: 'profiles',
    operation: 'select',
    filters: [{ column: 'auth_user_id', op: 'eq', value: body.user?.id }],
    maybeSingle: true,
  }),
})
const profBody = await prof.json()
console.log('profile query', prof.status, profBody.data?.role, profBody.error)

await pool.end()
