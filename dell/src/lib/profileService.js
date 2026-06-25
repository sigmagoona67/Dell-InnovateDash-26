import { requireInsforge } from './insforgeClient'
import { buildRoleMismatchError } from './roleAuth'

function getDatabase() {
  return requireInsforge().database
}

export async function findProfileByAuthUserId(authUserId) {
  const { data, error } = await getDatabase()
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createProfile({ authUserId, email, role, displayName }) {
  const { data, error } = await getDatabase()
    .from('profiles')
    .insert([
      {
        auth_user_id: authUserId,
        email,
        role,
        display_name: displayName,
      },
    ])
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function findYouthProfileByUserId(profileId) {
  const { data, error } = await getDatabase()
    .from('youth_profiles')
    .select('*')
    .eq('user_id', profileId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createYouthProfile({ profileId, preferredName }) {
  const { data, error } = await getDatabase()
    .from('youth_profiles')
    .insert([
      {
        user_id: profileId,
        preferred_name: preferredName,
        assigned_staff_id: null,
        assignment_status: 'pending',
        onboarding_completed: false,
      },
    ])
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function ensureYouthProfileRecord({ profileId, preferredName }) {
  const { data: appProfile, error: profileError } = await getDatabase()
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) throw profileError
  if (appProfile?.role && appProfile.role !== 'youth') {
    throw new Error(buildRoleMismatchError(appProfile.role))
  }

  const existing = await findYouthProfileByUserId(profileId)
  const trimmedName = preferredName?.trim() || null

  if (existing) {
    const updatePayload = {}
    if (trimmedName) updatePayload.preferred_name = trimmedName

    if (!existing.assigned_staff_id) {
      updatePayload.assigned_staff_id = null
      updatePayload.assignment_status = 'pending'
    }

    const { data, error } = await getDatabase()
      .from('youth_profiles')
      .update(updatePayload)
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw error
    console.log('[youth-signup] youth_profiles update success:', data)
    return data
  }

  const created = await createYouthProfile({
    profileId,
    preferredName: trimmedName || 'Youth',
  })
  console.log('[youth-signup] youth_profiles insert success:', created)
  return created
}

export async function findStaffProfileById(staffProfileId) {
  const { data, error } = await getDatabase()
    .from('profiles')
    .select('id, display_name, email')
    .eq('id', staffProfileId)
    .maybeSingle()

  if (error) throw error
  return data
}

export function resolveDisplayNameFromUser(user, fallback = '') {
  const fromAuth = user?.profile?.name?.trim()
  if (fromAuth) return fromAuth

  const emailPrefix = user?.email?.split('@')[0]?.trim()
  if (emailPrefix) return emailPrefix

  return fallback
}

export async function upsertAppProfileAfterAuth({ authUserId, email, role, name }) {
  const trimmedName = name?.trim()
  const emailPrefix = email?.split('@')[0]?.trim()
  const displayName = trimmedName || emailPrefix || (role === 'staff' ? 'Staff' : 'Youth')

  let profile = await findProfileByAuthUserId(authUserId)

  if (profile) {
    if (profile.role && role && profile.role !== role) {
      throw new Error(buildRoleMismatchError(profile.role))
    }

    const updates = {}
    if (displayName && profile.display_name !== displayName) updates.display_name = displayName
    if (role && profile.role !== role) updates.role = role
    if (email && profile.email !== email) updates.email = email

    if (Object.keys(updates).length > 0) {
      const { data, error } = await getDatabase()
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select('*')
        .single()

      if (error) throw error
      profile = data
      console.log('[youth-signup] profiles update success:', profile)
    } else {
      console.log('[youth-signup] profiles already exists:', profile)
    }
  } else {
    profile = await createProfile({
      authUserId,
      email,
      role,
      displayName,
    })
    console.log('[youth-signup] profiles insert success:', profile)
  }

  if (role === 'youth' && profile.role === 'youth') {
    await ensureYouthProfileRecord({
      profileId: profile.id,
      preferredName: displayName,
    })
  }

  if (role === 'staff' && profile.role === 'staff') {
    await ensureStaffProfileRecord({ profileId: profile.id })
  }

  return profile
}

export async function findStaffProfileRecordByUserId(profileId) {
  const { data, error } = await getDatabase()
    .from('staff_profiles')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createStaffProfileRecord({ profileId }) {
  const { data, error } = await getDatabase()
    .from('staff_profiles')
    .insert([{ profile_id: profileId, questionnaire_completed: false }])
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function ensureStaffProfileRecord({ profileId }) {
  const { data: appProfile, error: profileError } = await getDatabase()
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) throw profileError
  if (appProfile?.role && appProfile.role !== 'staff') {
    throw new Error(buildRoleMismatchError(appProfile.role))
  }

  const existing = await findStaffProfileRecordByUserId(profileId)
  if (existing) return existing
  return createStaffProfileRecord({ profileId })
}

/** @deprecated Use upsertAppProfileAfterAuth */
export async function initializeAppProfileAfterSignup(args) {
  return upsertAppProfileAfterAuth(args)
}
