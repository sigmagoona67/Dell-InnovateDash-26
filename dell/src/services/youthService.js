import { requireInsforge } from '../lib/insforgeClient'
import {
  createProfile,
  ensureYouthProfileRecord,
  findProfileByAuthUserId,
  findStaffProfileById,
  resolveDisplayNameFromUser,
  upsertAppProfileAfterAuth,
} from '../lib/profileService'
import { getQuestionnaire, reconcileYouthOnboardingStatus } from './questionnaireService'

export async function getCurrentAuthUser() {
  const { data, error } = await requireInsforge().auth.getCurrentUser()
  if (error) throw error
  return data?.user ?? null
}

export async function requireYouthUser() {
  const user = await getCurrentAuthUser()
  if (!user) throw new Error('Not authenticated')

  const role = user.profile?.role
  if (role && role !== 'youth') {
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

export async function bootstrapYouthSession(source = 'unknown') {
  console.log('[youth-auth] bootstrap start:', source)

  const insforge = requireInsforge()
  const user = await requireYouthUser()
  console.log('[youth-auth] current user id:', user.id)
  console.log('[youth-auth] auth profile role:', user.profile?.role || '(none)')

  if (user.profile?.role !== 'youth') {
    console.log('[youth-auth] setting auth profile role to youth')
    const { error: profileError } = await insforge.auth.setProfile({
      role: 'youth',
      email: user.email,
      name: user.profile?.name,
    })
    if (profileError) {
      console.warn('[youth-auth] failed to set auth profile role:', profileError.message)
    }
  }

  const profile = await upsertAppProfileAfterAuth({
    authUserId: user.id,
    email: user.email,
    role: 'youth',
    name: user.profile?.name,
  })
  console.log('[youth-auth] user role (profiles table):', profile.role)

  const youth = await ensureYouthProfile({
    profileId: profile.id,
    preferredName: profile.display_name,
  })

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

  return {
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
