import { upsertAppProfileAfterAuth } from './profileService'

const ROLE_CACHE_PREFIX = 'carebridge-role:'

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
    await insforge.auth.signOut()
    throw new Error(
      `Role mismatch. This account is registered as ${signedInRole}. Please use the correct portal.`,
    )
  }

  return signedInRole || role
}

export async function loginWithRole(insforge, { email, password, role }) {
  const { data, error } = await insforge.auth.signInWithPassword({ email, password })
  if (error) throw error

  await resolveUserRole(insforge, { data, role, email })

  if (role === 'youth' || role === 'staff') {
    await upsertAppProfileAfterAuth({
      authUserId: data.user.id,
      email,
      role,
      name: data.user?.profile?.name,
    })
  }

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
