/**
 * Remove youth_profiles / youth_questionnaire rows linked to a staff profiles.id.
 * Usage: node backend/scripts/cleanup-orphan-youth-on-staff.mjs lifeiwuwu02@gmail.com
 */
import pg from 'pg'

const email = process.argv[2]
if (!email) {
  console.error('Usage: node cleanup-orphan-youth-on-staff.mjs <email>')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})

await client.connect()

const { rows: profiles } = await client.query(
  `SELECT p.id, p.role, p.email
   FROM public.profiles p
   JOIN public.auth_users u ON u.id = p.auth_user_id
   WHERE lower(u.email) = lower($1)`,
  [email],
)

if (!profiles.length) {
  console.log('No profile found for', email)
  await client.end()
  process.exit(0)
}

const profile = profiles[0]
console.log('Profile:', profile)

if (profile.role !== 'staff') {
  console.log('Profile is not staff — nothing to clean.')
  await client.end()
  process.exit(0)
}

const { rows: youthRows } = await client.query(
  `SELECT id, preferred_name, onboarding_completed FROM public.youth_profiles WHERE user_id = $1`,
  [profile.id],
)

if (!youthRows.length) {
  console.log('No orphan youth_profiles on this staff account.')
  await client.end()
  process.exit(0)
}

for (const youth of youthRows) {
  console.log('Deleting youth_questionnaire for youth_id', youth.id)
  await client.query(`DELETE FROM public.youth_questionnaire WHERE youth_id = $1`, [youth.id])
  console.log('Deleting youth_profiles id', youth.id, youth.preferred_name)
  await client.query(`DELETE FROM public.youth_profiles WHERE id = $1`, [youth.id])
}

console.log('Cleanup complete.')
await client.end()
