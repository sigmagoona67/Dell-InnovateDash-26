import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), '.env.local') })

const GATEWAY = 'http://127.0.0.1:3001'
const youthId = '141fabb2-ea99-4b55-a6e0-b177ea3d1d6d'

const signin = await fetch(`${GATEWAY}/api/v1/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'lifeiwuwu05@gmail.com', password: 'testpassword123' }),
})
const sj = await signin.json()
if (!sj.accessToken) {
  console.error('staff signin failed', sj)
  process.exit(1)
}

const res = await fetch(`${GATEWAY}/api/v1/ai-chat/invoke`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${sj.accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'regenerateProfileInsights', youthId, riskLevel: 'high' }),
})
const body = await res.json()
console.log('status', res.status, body.error || 'ok')
const s = body.insights?.overall_summary || ''
console.log('summary:', s.slice(0, 500))
console.log('rule fallback:', /\bpresents as a young person\b/i.test(s))
console.log('words:', s.split(/\s+/).filter(Boolean).length)
