import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

dotenv.config({ path: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), '.env.local') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})

const { rows: youths } = await pool.query(
  `SELECT yp.id, yp.preferred_name, p.email FROM youth_profiles yp JOIN profiles p ON p.id = yp.user_id WHERE yp.preferred_name ILIKE '%lifei06%' OR p.email ILIKE '%lifei06%'`,
)
console.log('youths', youths)

if (youths[0]) {
  const { rows: reqs } = await pool.query(
    `SELECT id, slot_date::text, start_time::text, status, initiated_by FROM consultation_requests WHERE youth_id = $1 ORDER BY created_at DESC`,
    [youths[0].id],
  )
  console.log('requests', reqs)
}

const { rows: all } = await pool.query(
  `SELECT cr.id, yp.preferred_name, cr.slot_date::text, cr.start_time::text, cr.status, cr.initiated_by FROM consultation_requests cr JOIN youth_profiles yp ON yp.id = cr.youth_id ORDER BY cr.created_at DESC LIMIT 20`,
)
console.log('all requests', all)

await pool.end()
