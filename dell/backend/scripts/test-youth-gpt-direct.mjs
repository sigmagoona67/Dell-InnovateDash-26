import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

if (!globalThis.Deno) {
  globalThis.Deno = {
    env: {
      get(key) {
        return process.env[key]
      },
    },
  }
}

const { default: handler } = await import('../../functions/youth-ai-chat.ts')

// Minimal mock request for callChatGpt path - invoke sendMessage needs full auth
// Instead test OpenRouter through the same fetch path as youth-ai-chat
const apiKey = Deno.env.get('OPENROUTER_API_KEY')
console.log('key configured', !!apiKey)
console.log('CHAT_MODEL', Deno.env.get('OPENROUTER_CHAT_MODEL') || 'openai/gpt-4o')

const msg =
  'School was really loud today and kids kept clicking pens. I felt irritated and sad. My parents do not understand why I need quiet.'

const systemPrompt = `You are a warm youth mental health companion. Reply in JSON: {"reply":"...","summary":"...","riskLevel":"low","crisisDetected":false,"escalationNeeded":false}. English reply 120+ words with bullet points using •.`

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://carebridge.ai',
    'X-Title': 'CareBridge AI',
  },
  body: JSON.stringify({
    model: Deno.env.get('OPENROUTER_CHAT_MODEL') || 'openai/gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: msg },
    ],
    temperature: 0.8,
    max_tokens: 1600,
    response_format: { type: 'json_object' },
  }),
})

console.log('openrouter status', response.status)
const payload = await response.json()
const content = payload?.choices?.[0]?.message?.content
console.log('content length', content?.length)
try {
  const parsed = JSON.parse(content)
  console.log('reply length', parsed.reply?.length)
  console.log('has bullets', /•/.test(parsed.reply || ''))
  console.log('preview', parsed.reply?.slice(0, 200))
} catch (e) {
  console.log('parse error', e.message)
  console.log('raw', content?.slice(0, 300))
}
