import { readPersistedAuthSession } from './authPersistence'

const CACHE_KEY = 'carebridge-staff-bootstrap-v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

let memoryStaffBootstrap = null
let memoryStaffBootstrapUserId = null

export function readStaffBootstrapMemory(authUserId) {
  if (!authUserId || memoryStaffBootstrapUserId !== authUserId) return null
  return memoryStaffBootstrap
}

export function writeStaffBootstrapMemory(authUserId, context) {
  memoryStaffBootstrap = context
  memoryStaffBootstrapUserId = authUserId
}

export function clearStaffBootstrapMemory() {
  memoryStaffBootstrap = null
  memoryStaffBootstrapUserId = null
}

export function isValidStaffBootstrapContext(context) {
  return Boolean(context?.user?.id && context?.staffProfile?.id)
}

export function readStaffBootstrapCache() {
  if (typeof window === 'undefined') return null
  try {
    const authUserId = readPersistedAuthSession()?.user?.id
    if (!authUserId) return null

    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (parsed.authUserId !== authUserId) return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null
    if (!isValidStaffBootstrapContext(parsed.context)) return null

    return parsed.context || null
  } catch {
    return null
  }
}

export function writeStaffBootstrapCache(authUserId, context) {
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

export function clearStaffBootstrapCache() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  clearStaffBootstrapMemory()
}
