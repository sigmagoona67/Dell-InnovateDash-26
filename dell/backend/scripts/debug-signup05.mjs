import pg from 'pg'

const email = 'lifeiwuwu05@gmail.com'
const password = 'testpassword123'

const client = new pg.Client({
  connectionString: 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})
await client.connect()

const { rows } = await client.query(
  `SELECT u.id, u.email, p.id as profile_id, p.role, p.display_name
   FROM auth_users u
   LEFT JOIN profiles p ON p.auth_user_id = u.id
   WHERE lower(u.email) = lower($1)`,
  [email],
)
console.log('DB:', rows)

const signup = await fetch('http://127.0.0.1:3001/api/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const signupText = await signup.text()
console.log('signup', signup.status, signupText)

if (signup.status === 200) {
  const { accessToken } = JSON.parse(signupText)
  const patch = await fetch('http://127.0.0.1:3001/api/v1/auth/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ role: 'staff', email, name: 'Lifei05' }),
  })
  const patchText = await patch.text()
  console.log('patch profile', patch.status, patchText)

  const query = await fetch('http://127.0.0.1:3001/api/v1/profile/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      table: 'profiles',
      operation: 'select',
      select: '*',
      filters: [{ column: 'auth_user_id', op: 'eq', value: JSON.parse(patchText).user?.id || JSON.parse(signupText).user?.id }],
      maybeSingle: true,
    }),
  })
  const queryText = await query.text()
  console.log('profile query', query.status, queryText)
}

await client.end()
