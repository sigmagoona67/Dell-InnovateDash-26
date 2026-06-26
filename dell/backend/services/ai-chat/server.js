import cors from 'cors'
import express from 'express'
import { authMiddleware } from '../../lib/authMiddleware.js'
import { OPENROUTER_API_KEY, OPENROUTER_CHAT_MODEL } from '../../lib/config.js'
import { startService } from '../../lib/startService.js'
import dataRoutes from './routes.js'
import invokeRoutes from './invokeRoutes.js'

if (!OPENROUTER_API_KEY) {
  console.warn('[ai-chat] OPENROUTER_API_KEY is not set — replies will use local fallback templates (not GPT)')
} else {
  console.log(`[ai-chat] OpenRouter configured (model: ${OPENROUTER_CHAT_MODEL || 'openai/gpt-4o'})`)
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '8mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'ai-chat' }))
app.use(authMiddleware, dataRoutes)
app.use(authMiddleware, invokeRoutes)
startService(app, 'ai-chat', 'ai-chat')
