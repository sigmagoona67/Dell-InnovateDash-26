import { ensureAuthSession } from '../lib/authService'
import {
  createProfile,
  ensureYouthProfileRecord,
  findProfileByAuthUserId,
  findStaffProfileById,
  findYouthProfileByUserId,
  resolveDisplayNameFromUser,
  upsertAppProfileAfterAuth,
} from '../lib/profileService'
import { getQuestionnaire, reconcileYouthOnboardingStatus } from './questionnaireService'
import {
  readYouthBootstrapCache,
  readYouthBootstrapMemory,
  writeYouthBootstrapCache,
  writeYouthBootstrapMemory,
} from '../lib/youthBootstrapCache'
import { readPersistedAuthSession } from '../lib/authPersistence'

function resolveAuthEmail(user) {
  return user?.email?.trim() || readPersistedAuthSession()?.user?.email?.trim() || null
}

export async function getCurrentAuthUser() {
  const user = await ensureAuthSession()
  return user
}

export async function requireYouthUser() {
  const user = await getCurrentAuthUser()
  if (!user) throw new Error('Not authenticated')

  const dbProfile = await findProfileByAuthUserId(user.id)
  const registeredRole = dbProfile?.role || user.profile?.role
  if (registeredRole && registeredRole !== 'youth') {
    throw new Error('Role mismatch. Please use the Youth Portal.')
  }

  return user
}

export async function ensureAppProfile(user, { forceRole = null } = {}) {
  const email = user.email
  const displayName = resolveDisplayNameFromUser(user)
  const role = forceRole || user.profile?.role || 'youth'

  const existing = await findProfileByAuthUserId(user.id)
  if (existing) {
    if (existing.role && existing.role !== 'youth') {
      throw new Error('Role mismatch. Please use the Youth Portal.')
    }
    console.log('[youth-auth] loaded profile:', existing)
    return existing
  }

  console.log('[youth-auth] creating app profile with role:', role)
  const created = await createProfile({
    authUserId: user.id,
    email,
    role,
    displayName,
  })
  console.log('[youth-auth] created profile:', created)
  return created
}

export async function ensureYouthProfile({ profileId, preferredName }) {
  const youth = await ensureYouthProfileRecord({ profileId, preferredName })
  console.log('[youth-auth] youth profile ready:', youth)
  return youth
}

export function getYouthDestination(onboardingComplete) {
  return onboardingComplete ? '/youth-chat/portal' : '/youth-chat/onboarding'
}

export async function bootstrapYouthSession(
  source = 'unknown',
  { preferCache = true, revalidateOnboarding = false, revalidateAssignment = false } = {},
) {
  console.log('[youth-auth] bootstrap start:', source, {
    preferCache,
    revalidateOnboarding,
    revalidateAssignment,
  })

  const user = await requireYouthUser()
  const bypassFullCache = revalidateOnboarding || revalidateAssignment

  const memoryCached = readYouthBootstrapMemory(user.id)
  if (preferCache && !bypassFullCache && memoryCached) {
    return memoryCached
  }

  const diskCached = readYouthBootstrapCache()
  const cached = memoryCached || (diskCached?.user?.id === user.id ? diskCached : null)

  if (preferCache && !bypassFullCache && diskCached?.user?.id === user.id) {
    writeYouthBootstrapMemory(user.id, diskCached)
    return diskCached
  }

  if (preferCache && revalidateAssignment && cached?.profile?.id) {
    const freshYouth = await findYouthProfileByUserId(cached.profile.id)
    if (!freshYouth) {
      throw new Error('Youth profile is missing. Please refresh and try again.')
    }

    const { youth: reconciledYouth, onboardingComplete } = await reconcileYouthOnboardingStatus(
      freshYouth,
      cached.questionnaire,
    )

    let assignedStaff = null
    if (reconciledYouth.assigned_staff_id) {
      assignedStaff = await findStaffProfileById(reconciledYouth.assigned_staff_id)
    }

    const result = {
      ...cached,
      user,
      youth: reconciledYouth,
      onboardingComplete,
      assignedStaff,
      destination: getYouthDestination(onboardingComplete),
    }

    writeYouthBootstrapMemory(user.id, result)
    writeYouthBootstrapCache(user.id, result)
    console.log('[youth-auth] assignment refresh:', {
      youthId: reconciledYouth.id,
      assignedStaffId: reconciledYouth.assigned_staff_id,
      hasAssignedStaff: Boolean(assignedStaff),
    })
    return result
  }

  console.log('[youth-auth] current user id:', user.id)
  console.log('[youth-auth] auth profile role:', user.profile?.role || '(none)')

  const useEntityCache = preferCache && !revalidateOnboarding && !revalidateAssignment

  const profile =
    (useEntityCache && cached?.profile) ||
    (await upsertAppProfileAfterAuth({
      authUserId: user.id,
      email: resolveAuthEmail(user),
      role: 'youth',
      name: user.profile?.name || resolveDisplayNameFromUser(user),
    }))
  console.log('[youth-auth] user role (profiles table):', profile.role)

  const youth =
    (useEntityCache && cached?.youth) ||
    (await ensureYouthProfile({
      profileId: profile.id,
      preferredName: profile.display_name,
    }))

  const questionnaire = await getQuestionnaire(youth.id)
  const { youth: reconciledYouth, onboardingComplete } = await reconcileYouthOnboardingStatus(
    youth,
    questionnaire,
  )
  console.log('[youth-auth] onboarding status:', reconciledYouth.onboarding_completed, 'current:', onboardingComplete)

  let assignedStaff = null
  if (reconciledYouth.assigned_staff_id) {
    assignedStaff = await findStaffProfileById(reconciledYouth.assigned_staff_id)
  }

  const destination = getYouthDestination(onboardingComplete)
  console.log('[youth-auth] final route destination:', destination)

  const result = {
    user,
    profile,
    youth: reconciledYouth,
    questionnaire,
    onboardingComplete,
    assignedStaff,
    displayName:
      reconciledYouth.preferred_name ||
      profile.display_name ||
      resolveDisplayNameFromUser(user) ||
      profile.email.split('@')[0],
    destination,
  }

  writeYouthBootstrapMemory(user.id, result)
  writeYouthBootstrapCache(user.id, result)

  return result
}

export async function loadYouthContext() {
  return bootstrapYouthSession('session-load')
}

export function getAssignedWorkerView(youth, assignedStaff) {
  if (!youth.assigned_staff_id || !assignedStaff) {
    return {
      hasAssignedWorker: false,
      status: 'Pending Assignment',
      message:
        'We are currently matching you with the most suitable youth worker based on your preferences and needs.',
    }
  }

  return {
    hasAssignedWorker: true,
    name: assignedStaff.display_name || 'Youth Worker',
    email: assignedStaff.email || '',
    status: 'Available',
    message: `Your AI conversation summary will be shared with ${assignedStaff.display_name || 'your youth worker'} to provide continuous support.`,
  }
}
