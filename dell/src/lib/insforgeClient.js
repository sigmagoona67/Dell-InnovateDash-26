import { createClient } from '@insforge/sdk'

const baseUrl = import.meta.env.VITE_INSFORGE_URL?.trim().replace(/\/+$/, '')
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY?.trim()

export const isInsforgeConfigured = Boolean(baseUrl && anonKey)

export const insforge = isInsforgeConfigured
  ? createClient({
      baseUrl,
      anonKey,
      timeout: 300000,
    })
  : null

export const insforgeConfigHint = isInsforgeConfigured
  ? ''
  : 'Missing InsForge configuration. Please set VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY in .env.'

export function requireInsforge() {
  if (!insforge) {
    throw new Error(insforgeConfigHint || 'InsForge client is not configured.')
  }
  return insforge
}

/** Same authenticated client — do NOT create a second client (auth token is not shared). */
export function requireInsforgeProfileSync() {
  return requireInsforge()
}

/** @deprecated Use requireInsforge() — separate clients do not share login tokens. */
export function requireInsforgeLongRunning() {
  return requireInsforge()
}

export function getInsforge() {
  return insforge
}
