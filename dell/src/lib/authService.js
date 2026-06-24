import { upsertAppProfileAfterAuth } from './profileService'
<<<<<<< Updated upstream
=======
import { requireInsforge } from './insforgeClient'
import {
  applyAuthSessionToClient,
  clearPersistedAuthSession,
  readPersistedAuthSession,
  refreshAuthSessionWithToken,
  validateStoredAccessToken,
  writePersistedAuthSession,
} from './authPersistence'
import { clearStaffBootstrapCache } from './staffBootstrapCache'
import { STAFF_ACCESS_CODE } from './staffAccessConfig'
>>>>>>> Stashed changes

const ROLE_CACHE_PREFIX = 'carebridge-role:'

let memoryAuthUser = null

export function clearAuthSessionState(client) {
  memoryAuthUser = null
  clearPersistedAuthSession()
  clearStaffBootstrapCache()
  const insforge = client || requireInsforge()
  insforge?.auth?.signOut?.().catch(() => {})
}

export function persistAuthSessionFromSignIn(data) {
  if (!data?.accessToken) return
  writePersistedAuthSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  })
  memoryAuthUser = data.user || null
  applyAuthSessionToClient(requireInsforge(), data)
}

export const INSFORGE_DISABLE_VERIFICATION_HINT =
  'For demo sign-in, disable email verification in InsForge Authentication settings, or run: npx @insforge/cli config apply --auto-approve'

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

export async function ensureAuthSession(insforge) {
  const client = insforge || requireInsforge()

  function userFrom(result) {
    return result?.data?.user ?? null
  }

  function isTransientAuthError(error) {
    if (!error) return false
    const text = String(error.message || error.code || '').toLowerCase()
    return (
      text.includes('fetch failed') ||
      text.includes('failed to fetch') ||
      text.includes('network') ||
      text.includes('timeout') ||
      text.includes('timed out')
    )
  }

  if (memoryAuthUser) {
    applyAuthSessionToClient(client, readPersistedAuthSession())
    return memoryAuthUser
  }

  const persisted = readPersistedAuthSession()
  if (persisted?.accessToken || persisted?.refreshToken) {
    applyAuthSessionToClient(client, persisted)
  }

  if (persisted?.accessToken) {
    const user = await validateStoredAccessToken(client, persisted.accessToken)
    if (user) {
      memoryAuthUser = user
      writePersistedAuthSession({ ...persisted, user })
      return user
    }
  }

  if (persisted?.refreshToken) {
    const refreshed = await refreshAuthSessionWithToken(client, persisted.refreshToken)
    if (refreshed?.user) {
      memoryAuthUser = refreshed.user
      return refreshed.user
    }
  }

  if (persisted?.accessToken) {
    clearPersistedAuthSession()
  }

  let result = await client.auth.getCurrentUser()
  if (result.error && !isTransientAuthError(result.error)) throw result.error
  if (userFrom(result)) {
    memoryAuthUser = userFrom(result)
    return memoryAuthUser
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 150 * attempt))
    const refreshed = await client.auth.refreshSession()
    if (refreshed.error && !isTransientAuthError(refreshed.error)) break
    if (refreshed.data?.user) {
      memoryAuthUser = refreshed.data.user
      writePersistedAuthSession({
        accessToken: refreshed.data.accessToken,
        refreshToken: refreshed.data.refreshToken,
        user: refreshed.data.user,
      })
      return refreshed.data.user
    }

    result = await client.auth.getCurrentUser()
    if (result.error && !isTransientAuthError(result.error)) throw result.error
    if (userFrom(result)) {
      memoryAuthUser = userFrom(result)
      return memoryAuthUser
    }
  }

  return null
}

export async function loginWithRole(insforge, { email, password, role }) {
  const { data, error } = await insforge.auth.signInWithPassword({ email, password })
  if (error) throw error

  persistAuthSessionFromSignIn(data)
  await resolveUserRole(insforge, { data, role, email })

  // Profile rows are created during session bootstrap after redirect (faster login).
  return data
}

export async function signUpWithRole(insforge, { email, password, role, name }) {
  const trimmedName = name?.trim()
  if (!trimmedName) {
    throw new Error('Name is required.')
  }

  const { data, error } = await insforge.auth.signUp({ email, password })
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

  const signInAttempt = await insforge.auth.signInWithPassword({ email, password })
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

export function getVerificationGuidance(error) {
  if (isVerificationBlocked(error)) {
    return INSFORGE_DISABLE_VERIFICATION_HINT
  }
  return null
}
