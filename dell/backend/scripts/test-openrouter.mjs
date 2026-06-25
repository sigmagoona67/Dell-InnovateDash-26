import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(root, '.env.local') })

const key = process.env.OPENROUTER_API_KEY
if (!key) {
  console.error('OPENROUTER_API_KEY missing')
  process.exit(1)
}

try {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'Return JSON with key reply and value hello' }],
      response_format: { type: 'json_object' },
    }),
  })
  const text = await response.text()
  console.log('status', response.status)
  console.log(text.slice(0, 500))
} catch (error) {
  console.error('fetch failed:', error.message)
  if (error.cause) console.error('cause:', error.cause.message)
  process.exit(1)
}
