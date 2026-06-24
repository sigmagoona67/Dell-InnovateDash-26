import { readPersistedAuthSession } from './authPersistence'

const CACHE_KEY = 'carebridge-youth-bootstrap-v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

let memoryYouthBootstrap = null
let memoryYouthBootstrapUserId = null

export function readYouthBootstrapMemory(authUserId) {
  if (!authUserId || memoryYouthBootstrapUserId !== authUserId) return null
  return memoryYouthBootstrap
}

export function writeYouthBootstrapMemory(authUserId, context) {
  memoryYouthBootstrap = context
  memoryYouthBootstrapUserId = authUserId
}

export function clearYouthBootstrapMemory() {
  memoryYouthBootstrap = null
  memoryYouthBootstrapUserId = null
}

export function readYouthBootstrapCache() {
  if (typeof window === 'undefined') return null
  try {
    const authUserId = readPersistedAuthSession()?.user?.id
    if (!authUserId) return null

    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (parsed.authUserId !== authUserId) return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null

    return parsed.context || null
  } catch {
    return null
  }
}

export function writeYouthBootstrapCache(authUserId, context) {
  if (typeof window === 'undefined' || !authUserId || !context) return
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      authUserId,
      savedAt: Date.now(),
      context,
    }),
  )
}

export function clearYouthBootstrapCache() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  clearYouthBootstrapMemory()
}
