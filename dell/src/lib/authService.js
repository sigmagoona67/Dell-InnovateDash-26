import { upsertAppProfileAfterAuth } from './profileService'
import { STAFF_ACCESS_CODE } from './staffAccessConfig'
import { requireInsforge } from './insforgeClient'
import {
  applyAuthSessionToClient,
  clearPersistedAuthSession,
  hasPersistedAuthSession,
  primeAuthClientFromPersistence,
  readPersistedAuthSession,
  refreshAuthSessionWithToken,
  validateStoredAccessToken,
  writePersistedAuthSession,
} from './authPersistence'
import { clearStaffBootstrapCache } from './staffBootstrapCache'
import { clearYouthBootstrapCache } from './youthBootstrapCache'

const ROLE_CACHE_PREFIX = 'carebridge-role:'

let memoryAuthUser = null
let restorePromise = null

export function clearAuthSessionState(client) {
  memoryAuthUser = null
  restorePromise = null
  clearPersistedAuthSession()
  clearStaffBootstrapCache()
  clearYouthBootstrapCache()
  const insforge = client || requireInsforge()
  insforge?.auth?.signOut?.().catch(() => {})
}

export function persistAuthSessionFromSignIn(data) {
  if (!data?.accessToken && !data?.refreshToken && !data?.refresh_token) return

  const session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || data.refresh_token || null,
    user: data.user,
  }

  writePersistedAuthSession(session)
  memoryAuthUser = data.user || null
  applyAuthSessionToClient(requireInsforge(), session)
}

export const INSFORGE_DISABLE_VERIFICATION_HINT =
  'Email verification is disabled on the CareBridge API — you can sign in immediately after signup.'

function isVerificationBlocked(error) {
  if (!error) return false
  const message = (error.message || '').toLowerCase()
  const status = error.statusCode ?? error.status

  return (
    status === 403 ||
    message.includes('email not verified') ||
    message.includes('email verification') ||
    message.includes('verify your email') ||
    message.includes('verification required')
  )
}

export function parseAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.'

  if (isVerificationBlocked(error)) {
    return null
  }

  const message = (error.message || '').toLowerCase()

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password') ||
    message.includes('wrong password')
  ) {
    return 'Wrong email or password. Please try again.'
  }

  if (message.includes('not found') || message.includes('user does not exist')) {
    return 'Account not found. Please sign up first.'
  }

  if (message.includes('role mismatch')) {
    return error.message
  }

  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return 'Connection timed out. Check your network or VPN, then try again.'
  }

  return error.message || 'Authentication failed. Please try again.'
}

export function setPendingRole(email, role) {
  localStorage.setItem(`${ROLE_CACHE_PREFIX}${email.toLowerCase()}`, role)
}

export function getPendingRole(email) {
  return localStorage.getItem(`${ROLE_CACHE_PREFIX}${email.toLowerCase()}`)
}

export function clearPendingRole(email) {
  localStorage.removeItem(`${ROLE_CACHE_PREFIX}${email.toLowerCase()}`)
}

function buildAuthProfilePayload({ role, email, name }) {
  const payload = { role, email }
  const trimmedName = name?.trim()
  if (trimmedName) payload.name = trimmedName
  return payload
}

async function saveUserProfile(insforge, { role, email, name }) {
  const { error } = await insforge.auth.setProfile(buildAuthProfilePayload({ role, email, name }))
  if (error) throw error
  clearPendingRole(email)
}

async function resolveUserRole(insforge, { data, role, email }) {
  let signedInRole = data?.user?.profile?.role
  const pendingRole = getPendingRole(email)
  const existingName = data?.user?.profile?.name

  if (signedInRole === role) {
    clearPendingRole(email)
    return role
  }

  if (!signedInRole && pendingRole) {
    const { error: setRoleError } = await insforge.auth.setProfile(
      buildAuthProfilePayload({ role: pendingRole, email, name: existingName }),
    )
    if (!setRoleError) {
      signedInRole = pendingRole
      clearPendingRole(email)
    }
  }

  if (!signedInRole) {
    const { error: setRoleError } = await insforge.auth.setProfile(
      buildAuthProfilePayload({ role, email, name: existingName }),
    )
    if (!setRoleError) {
      signedInRole = role
      clearPendingRole(email)
    }
  }

  if (signedInRole && signedInRole !== role) {
    clearAuthSessionState(insforge)
    throw new Error(
      `Role mismatch. This account is registered as ${signedInRole}. Please use the correct portal.`,
    )
  }

  return signedInRole || role
}

function userFrom(result) {
  return result?.data?.user ?? null
}

async function restoreAuthSession(client) {
  const persisted = readPersistedAuthSession() || primeAuthClientFromPersistence(client)
  if (!persisted) return null

  if (persisted.accessToken) {
    const user = await validateStoredAccessToken(client, persisted.accessToken)
    if (user) {
      writePersistedAuthSession({ ...persisted, user })
      applyAuthSessionToClient(client, { ...persisted, user })
      return user
    }
  }

  if (persisted.refreshToken) {
    const refreshed = await refreshAuthSessionWithToken(client, persisted.refreshToken)
    if (refreshed?.user) return refreshed.user
  }

  const cookieRefresh = await Promise.race([
    client.auth.refreshSession(),
    new Promise((resolve) => {
      setTimeout(() => resolve({ data: null, error: null }), 5000)
    }),
  ])
  if (!cookieRefresh.error && cookieRefresh.data?.user) {
    writePersistedAuthSession({
      accessToken: cookieRefresh.data.accessToken,
      refreshToken: cookieRefresh.data.refreshToken || persisted.refreshToken || null,
      user: cookieRefresh.data.user,
    })
    applyAuthSessionToClient(client, {
      accessToken: cookieRefresh.data.accessToken,
      refreshToken: cookieRefresh.data.refreshToken || persisted.refreshToken || null,
      user: cookieRefresh.data.user,
    })
    return cookieRefresh.data.user
  }

  const result = await client.auth.getCurrentUser()
  if (!result.error && userFrom(result)) {
    writePersistedAuthSession({
      accessToken: persisted.accessToken || cookieRefresh.data?.accessToken || null,
      refreshToken: persisted.refreshToken || cookieRefresh.data?.refreshToken || null,
      user: userFrom(result),
    })
    return userFrom(result)
  }

  if (persisted.user) {
    return persisted.user
  }

  return null
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out. Check your network and try again.`)), ms)
    }),
  ])
}

function startBackgroundSessionRestore(client, persisted) {
  if (restorePromise) return restorePromise

  restorePromise = withTimeout(restoreAuthSession(client), 12000, 'Session restore')
    .then((user) => {
      if (user) {
        memoryAuthUser = user
        writePersistedAuthSession({ ...readPersistedAuthSession(), user })
      }
      return user
    })
    .catch((error) => {
      console.warn('[auth] background session restore failed:', error.message)
      return readPersistedAuthSession()?.user || null
    })
    .finally(() => {
      restorePromise = null
    })

  return restorePromise
}

export async function ensureAuthSession(insforge) {
  const client = insforge || requireInsforge()

  if (memoryAuthUser) {
    return memoryAuthUser
  }

  const persisted = readPersistedAuthSession()
  if (persisted?.accessToken && persisted?.user) {
    applyAuthSessionToClient(client, persisted)
    if (!persisted.user.email) {
      const fresh = await validateStoredAccessToken(client, persisted.accessToken)
      if (fresh?.email) {
        memoryAuthUser = fresh
        writePersistedAuthSession({ ...persisted, user: fresh })
        startBackgroundSessionRestore(client, { ...persisted, user: fresh })
        return fresh
      }
    }
    memoryAuthUser = persisted.user
    startBackgroundSessionRestore(client, persisted)
    return persisted.user
  }

  if (!restorePromise) {
    restorePromise = withTimeout(restoreAuthSession(client), 12000, 'Session restore')
      .then((user) => {
        memoryAuthUser = user
        restorePromise = null
        return user
      })
      .catch((error) => {
        restorePromise = null
        console.warn('[auth] session restore failed:', error.message)
        const fallback = readPersistedAuthSession()?.user || null
        memoryAuthUser = fallback
        return fallback
      })
  }

  return restorePromise
}

export async function loginWithRole(insforge, { email, password, role }) {
  memoryAuthUser = null
  restorePromise = null
  clearStaffBootstrapCache()

  const { data, error } = await withTimeout(
    insforge.auth.signInWithPassword({ email, password }),
    25000,
    'Sign in',
  )
  if (error) throw error

  persistAuthSessionFromSignIn(data)

  const signedInRole = data?.user?.profile?.role
  if (signedInRole && signedInRole !== role) {
    clearAuthSessionState(insforge)
    throw new Error(
      `Role mismatch. This account is registered as ${signedInRole}. Please use the correct portal.`,
    )
  }

  if (signedInRole !== role) {
    void resolveUserRole(insforge, { data, role, email }).catch((roleError) => {
      console.warn('[auth] role sync deferred:', roleError.message)
    })
  } else {
    clearPendingRole(email)
  }

  memoryAuthUser = data.user || null
  return data
}

export async function signUpWithRole(insforge, { email, password, role, name }) {
  const trimmedName = name?.trim()
  if (!trimmedName) {
    throw new Error('Name is required.')
  }

  clearAuthSessionState(insforge)

  const { data, error } = await withTimeout(
    insforge.auth.signUp({ email, password }),
    25000,
    'Sign up',
  )
  if (error) throw error

  if (data?.accessToken && data?.user?.id) {
    await saveUserProfile(insforge, { role, email, name: trimmedName })
    await upsertAppProfileAfterAuth({
      authUserId: data.user.id,
      email,
      role,
      name: trimmedName,
    })
    persistAuthSessionFromSignIn(data)
    return { kind: 'session', data }
  }

  const signInAttempt = await withTimeout(
    insforge.auth.signInWithPassword({ email, password }),
    25000,
    'Sign in',
  )
  if (!signInAttempt.error && signInAttempt.data?.user) {
    await saveUserProfile(insforge, { role, email, name: trimmedName })
    await upsertAppProfileAfterAuth({
      authUserId: signInAttempt.data.user.id,
      email,
      role,
      name: trimmedName,
    })
    persistAuthSessionFromSignIn(signInAttempt.data)
    return { kind: 'session', data: signInAttempt.data }
  }

  setPendingRole(email, role)

  if (data?.requireEmailVerification || isVerificationBlocked(signInAttempt.error)) {
    return {
      kind: 'verification-enabled',
      hint: INSFORGE_DISABLE_VERIFICATION_HINT,
    }
  }

  if (signInAttempt.error) {
    throw signInAttempt.error
  }

  return { kind: 'created' }
}

export async function signUpStaff(insforge, { fullName, email, password, accessCode }) {
  const trimmedName = fullName?.trim()
  if (!trimmedName) {
    throw new Error('Full name is required.')
  }

  if (!email?.trim() || !password) {
    throw new Error('Email and password are required.')
  }

  if (accessCode !== STAFF_ACCESS_CODE) {
    throw new Error('Invalid staff access code.')
  }

  return signUpWithRole(insforge, {
    email: email.trim(),
    password,
    role: 'staff',
    name: trimmedName,
  })
}

export function getVerificationGuidance(error) {
  if (isVerificationBlocked(error)) {
    return INSFORGE_DISABLE_VERIFICATION_HINT
  }
  return null
}

export { hasPersistedAuthSession }
