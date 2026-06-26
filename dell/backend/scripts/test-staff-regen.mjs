/**
 * Test staff regenerateYouthInsights path (staff-ai-assist).
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(root, '.env.local') })

const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3001'
const youthId = '141fabb2-ea99-4b55-a6e0-b177ea3d1d6d'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})

const { rows } = await pool.query(
  `SELECT p.email FROM profiles p JOIN youth_profiles y ON y.user_id = p.id WHERE y.id = $1`,
  [youthId],
)
const email = rows[0]?.email
await pool.end()

if (!email) throw new Error('youth not found')

const signup = await fetch(`${GATEWAY}/api/v1/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'lifeiwuwu05@gmail.com', password: 'testpassword123' }),
})
const sj = await signup.json()
if (!sj.accessToken) {
  console.error('staff signin failed', sj)
  process.exit(1)
}

const res = await fetch(`${GATEWAY}/api/v1/offline-summary/invoke`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${sj.accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'regenerateYouthInsights', youthId }),
})
const body = await res.json()
console.log('status', res.status)
const s = body.insights?.overall_summary || ''
console.log('summary first 300:', s.slice(0, 300))
console.log('is rule fallback:', /\bpresents as a young person\b/i.test(s))
console.log('word count:', s.split(/\s+/).filter(Boolean).length)
