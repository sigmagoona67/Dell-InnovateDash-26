import { readFileSync } from 'node:fs'
import { createClient } from '@insforge/sdk'

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

const env = loadEnv()
const baseUrl = env.VITE_INSFORGE_URL?.replace(/\/+$/, '')
const anonKey = env.VITE_INSFORGE_ANON_KEY

const client = createClient({ baseUrl, anonKey })

console.log('=== Debug: youth_profiles where assigned_staff_id IS NULL ===')
console.log('Base URL:', baseUrl)

const { data, error } = await client.database.from('youth_profiles').select('*').is('assigned_staff_id', null)

console.log('Anonymous query response data:', data)
console.log('Anonymous query error:', error)
