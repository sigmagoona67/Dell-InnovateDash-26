import pg from 'pg'

const email = process.argv[2]
if (!email) {
  console.error('Usage: node delete-auth-user.mjs <email>')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})
await client.connect()

const { rows } = await client.query(
  `SELECT id, email FROM public.auth_users WHERE lower(email) = lower($1)`,
  [email],
)
if (!rows.length) {
  console.log('No account found for', email)
  await client.end()
  process.exit(0)
}

const { id } = rows[0]
await client.query(`DELETE FROM public.auth_users WHERE id = $1`, [id])
console.log('Deleted auth user and cascaded profiles for', email)
await client.end()
