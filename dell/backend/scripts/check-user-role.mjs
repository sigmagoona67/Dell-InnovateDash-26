import pg from 'pg'
import bcrypt from 'bcryptjs'

const email = process.argv[2] || 'lifeiwuwu06@gmail.com'
const mode = process.argv[3] || 'check'
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})

if (mode === 'complete-staff') {
  const name = process.argv[4] || 'Lifei12'
  const password = process.argv[5] || 'TestPass123!'
  const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3001'
  const signin = await fetch(`${GATEWAY}/api/v1/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await signin.json()
  if (!signin.ok) throw new Error(`signin failed: ${body.error || signin.status}`)
  const patch = await fetch(`${GATEWAY}/api/v1/auth/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${body.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'staff', email, name }),
  })
  const patched = await patch.json()
  if (!patch.ok) throw new Error(`profile patch failed: ${patched.error || patch.status}`)
  const token = patched.accessToken || body.accessToken
  const prof = await fetch(`${GATEWAY}/api/v1/profile/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'profiles',
      operation: 'select',
      filters: [{ column: 'auth_user_id', op: 'eq', value: body.user.id }],
      maybeSingle: true,
    }),
  })
  const profBody = await prof.json()
  if (!profBody.data?.id) {
    await fetch(`${GATEWAY}/api/v1/profile/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'profiles',
        operation: 'insert',
        body: { auth_user_id: body.user.id, email, role: 'staff', display_name: name },
        single: true,
      }),
    })
  }
  await fetch(`${GATEWAY}/api/v1/profile/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'staff_profiles',
      operation: 'insert',
      body: { profile_id: profBody.data?.id, questionnaire_completed: false },
      single: true,
    }),
  }).catch(() => {})
  console.log(`Completed staff signup for ${email} (${name})`)
  await pool.end()
  process.exit(0)
}

if (mode === 'repair-staff') {
  const { rows: users } = await pool.query(
    'SELECT id, email FROM public.auth_users WHERE lower(email) = lower($1)',
    [email],
  )
  if (!users[0]) throw new Error(`No auth user for ${email}`)
  const { rows: profiles } = await pool.query(
    'SELECT id, role FROM public.profiles WHERE auth_user_id = $1',
    [users[0].id],
  )
  const profile = profiles[0]
  if (!profile) throw new Error('No profiles row — use staff Sign Up to finish registration')

  const { rows: youthRows } = await pool.query(
    'SELECT id FROM public.youth_profiles WHERE user_id = $1',
    [profile.id],
  )
  if (youthRows.length) {
    throw new Error('Cannot convert to staff: youth profile data exists. Use the Youth portal for this email.')
  }

  await pool.query(
    `UPDATE public.profiles SET role = 'staff', updated_at = NOW() WHERE id = $1`,
    [profile.id],
  )
  await pool.query(
    `INSERT INTO public.staff_profiles (profile_id, questionnaire_completed)
     VALUES ($1, FALSE)
     ON CONFLICT (profile_id) DO NOTHING`,
    [profile.id],
  )
  console.log(`Repaired ${email} → staff (profile ${profile.id})`)
  await pool.end()
  process.exit(0)
}

if (mode === 'reset-password') {
  const password = process.argv[4] || 'TestPass123!'
  const hash = await bcrypt.hash(password, 10)
  const { rows } = await pool.query(
    `UPDATE public.auth_users SET password_hash = $1 WHERE lower(email) = lower($2) RETURNING email`,
    [hash, email],
  )
  console.log('password reset for', rows[0]?.email || 'not found', '→', password)
  await pool.end()
  process.exit(0)
}

const { rows: users } = await pool.query('SELECT id, email FROM public.auth_users WHERE lower(email) = lower($1)', [email])
console.log('auth.users', users)

if (users[0]) {
  const { rows: profiles } = await pool.query(
    'SELECT id, auth_user_id, email, role, display_name FROM profiles WHERE auth_user_id = $1',
    [users[0].id],
  )
  console.log('profiles', profiles)

  if (profiles[0]) {
    const { rows: staff } = await pool.query('SELECT * FROM staff_profiles WHERE profile_id = $1', [
      profiles[0].id,
    ])
    const { rows: youth } = await pool.query('SELECT * FROM youth_profiles WHERE user_id = $1', [
      profiles[0].id,
    ])
    console.log('staff_profiles', staff)
    console.log('youth_profiles', youth)
  }
}

await pool.end()
