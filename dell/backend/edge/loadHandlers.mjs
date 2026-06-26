import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { register as registerTsx } from 'tsx/esm/api'
import dotenv from 'dotenv'
import { OPENROUTER_API_KEY, OPENROUTER_CHAT_MODEL, SERVICE_API_KEY } from '../lib/config.js'

registerTsx()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

if (!globalThis.Deno) {
  globalThis.Deno = {
    env: {
      get(key) {
        if (key === 'INSFORGE_BASE_URL') return process.env.CAREBRIDGE_API_URL || 'http://localhost:3001'
        if (key === 'API_KEY' || key === 'ANON_KEY') return process.env.SERVICE_API_KEY || SERVICE_API_KEY
        if (key === 'OPENROUTER_API_KEY') return process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY
        if (key === 'OPENROUTER_CHAT_MODEL') return process.env.OPENROUTER_CHAT_MODEL || OPENROUTER_CHAT_MODEL
        return process.env[key]
      },
    },
  }
}

export async function loadYouthAiHandler() {
  const mod = await import('../../functions/youth-ai-chat.ts')
  return mod.default
}

export async function loadStaffAiHandler() {
  const mod = await import('../../functions/staff-ai-assist.ts')
  return mod.default
}
