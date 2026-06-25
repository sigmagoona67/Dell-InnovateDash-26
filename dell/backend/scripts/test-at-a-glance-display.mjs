import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(root, '.env.local') })

if (!globalThis.Deno) {
  globalThis.Deno = {
    env: { get: (k) => process.env[k] },
  }
}

const youthId = '141fabb2-ea99-4b55-a6e0-b177ea3d1d6d'
const { createClient } = await import('../lib/createClient.js')
const pool = (await import('pg')).default
const pg = new pool.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})
const { rows } = await pg.query(
  `SELECT p.email, p.id as profile_id FROM profiles p JOIN youth_profiles y ON y.user_id = p.id WHERE y.id = $1`,
  [youthId],
)
await pg.end()

const signin = await fetch('http://127.0.0.1:3001/api/v1/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: rows[0].email, password: 'TestPass123!' }),
}).catch(() => null)

let token = null
if (signin?.ok) {
  const sj = await signin.json()
  token = sj.accessToken
}

if (!token) {
  const SERVICE_KEY = process.env.SERVICE_API_KEY || 'carebridge-service-key'
  const res = await fetch('http://127.0.0.1:3001/api/v1/ai-chat/invoke', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'repairYouthInsights', youthId }),
  })
  const body = await res.json()
  const s = body.insights?.overall_summary || ''
  console.log('via repair:', s.slice(0, 400))
  console.log('rule fallback:', /\bpresents as a young person\b/i.test(s))
  console.log('locked would fail rule:', /\bAcross contacts,\b/i.test(s))
  process.exit(0)
}

const client = createClient({ edgeFunctionToken: token })
const { data: saved } = await client.database.from('ai_dynamic_insights').select('overall_summary').eq('youth_id', youthId).maybeSingle()
console.log('DB saved first 400:', String(saved?.overall_summary || '').slice(0, 400))

const { loadYouthInsights } = await import('../../src/services/insightsFallbackService.js')
const display = await loadYouthInsights(client.database, youthId, 'lifeiwuwu07')
const d = display.insights?.overall_summary || ''
console.log('display source:', display.source)
console.log('display first 400:', d.slice(0, 400))
console.log('display is rule fallback:', /\bpresents as a young person\b/i.test(d))
console.log('same as DB:', d === saved?.overall_summary)
