import { ensureAuthSession } from '../lib/authService'
import { requireInsforge } from '../lib/insforgeClient'
import {
  buildAssignedYouthCardMeta,
  formatCurrentStateDisplay,
  formatLatestInteractionInsight,
  formatYouthNameLine,
} from '../lib/assignedYouthCard'
import { resolveCurrentConcern, resolveCasePreview } from '../lib/dashboardCard'
import { findProfileByAuthUserId, createProfile, resolveDisplayNameFromUser, ensureStaffProfileRecord, findStaffProfileRecordByUserId } from '../lib/profileService'
import { readStaffBootstrapCache, writeStaffBootstrapCache, readStaffBootstrapMemory, writeStaffBootstrapMemory } from '../lib/staffBootstrapCache'
import { getStaffQuestionnaire, reconcileStaffOnboardingStatus } from './staffQuestionnaireService'
import { resolveYouthRiskLevel } from '../lib/riskResolver'
import { RISK_ORDER, sortByRisk } from '../lib/staffMockData'
import { EMPTY_QUESTIONNAIRE, getQuestionnaire } from './questionnaireService'

import { loadYouthInsights } from './insightsFallbackService'
import {
  getConsultationRequestsForStaff,
  hasPendingYouthScheduleRequest,
  resolveUnreadStaffMeetingResponse,
} from './scheduleService'
import {
  closePendingReassignmentForYouth,
  getPendingReassignmentsForYouthIds,
  shouldShowPendingReassignment,
} from './reassignmentService'

function db() {
  return requireInsforge().database
}

function isMissingTableError(error) {
  if (!error) return false
  const message = String(error.message || error.details || error.hint || '').toLowerCase()
  const status = error.status ?? error.statusCode
  return (
    status === 404 ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('does not exist') ||
    (message.includes('relation') && message.includes('exist'))
  )
}

async function safeOptionalQuery(queryPromise, label) {
  const { data, error } = await queryPromise
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(`[staff] optional table unavailable (${label}):`, error.message)
      return null
    }
    throw error
  }
  return data
}

function mapYouthCard(
  youthRow,
  profileRow,
  questionnaire,
  sessions,
  offlineSessions,
  insights,
  messages,
  lastTimelineViewed,
  hasScheduleRequest = false,
  scheduleResponse = null,
) {
  const riskLevel = resolveYouthRiskLevel({
    insights,
    aiSessions: sessions,
    offlineSessions,
    messages: messages || [],
  })

  const crisisDetected = Boolean(
    insights?.crisis_detected || (sessions || []).some((session) => session.crisis_detected),
  )

  const displayName =
    youthRow.preferred_name || profileRow?.display_name || profileRow?.email?.split('@')[0] || 'Youth'

  const activityMeta = buildAssignedYouthCardMeta({
    messages: messages || [],
    sessions: sessions || [],
    offlineSessions: offlineSessions || [],
    insights,
    lastTimelineViewedAt: lastTimelineViewed,
  })

  const currentConcern = resolveCurrentConcern({ insights, questionnaire })
  const casePreview = resolveCasePreview({ insights, sessions, youthName: displayName })

  const age = youthRow.age ?? questionnaire?.age ?? null

  return {
    id: youthRow.id,
    userId: profileRow?.id,
    name: displayName,
    nameLine: formatYouthNameLine(displayName, age),
    email: profileRow?.email || '',
    onboardingCompleted: Boolean(youthRow.onboarding_completed),
    riskLevel,
    crisisDetected,
    hasNightAiChat: activityMeta.hasNightAiChat,
    hasScheduleRequest,
    scheduleResponse,
    currentConcern,
    casePreview,
    currentStateDisplay: formatCurrentStateDisplay(insights),
    latestInteractionInsight: formatLatestInteractionInsight(insights),
    lastActivityLabel: activityMeta.lastActivityLabel,
    lastActivityDisplay: activityMeta.lastActivityDisplay,
    lastActivityAt: activityMeta.lastActivityAt,
    assignmentStatus: youthRow.assignment_status,
    assignedStaffId: youthRow.assigned_staff_id,
  }
}

export async function getCurrentAuthUser() {
  const user = await ensureAuthSession()
  return user
}

export async function requireStaffUser() {
  const user = await getCurrentAuthUser()
  if (!user) throw new Error('Not authenticated')

  const role = user.profile?.role
  if (role && role !== 'staff') {
    throw new Error('Role mismatch. Please use the Staff Portal.')
  }

  return user
}

export async function ensureStaffProfile(user) {
  const email = user.email
  const displayName = resolveDisplayNameFromUser(user, 'Staff')

  let profile = await findProfileByAuthUserId(user.id)
  if (profile) {
    await ensureStaffProfileRecord({ profileId: profile.id })
    return profile
  }

  profile = await createProfile({
    authUserId: user.id,
    email,
    role: 'staff',
    displayName,
  })
  await ensureStaffProfileRecord({ profileId: profile.id })
  return profile
}

export function getStaffDestination(onboardingComplete) {
  return onboardingComplete ? '/staff-dashboard' : '/staff-dashboard/onboarding'
}

export async function bootstrapStaffSession({ preferCache = true } = {}) {
  const insforge = requireInsforge()
  const user = await requireStaffUser()

  const memoryCached = readStaffBootstrapMemory(user.id)
  if (preferCache && memoryCached) {
    return memoryCached
  }

  const cached = readStaffBootstrapCache()
  if (preferCache && cached?.user?.id === user.id) {
    writeStaffBootstrapMemory(user.id, cached)
    return cached
  }

  if (user.profile?.role !== 'staff') {
    await insforge.auth.setProfile({ role: 'staff', email: user.email, name: user.profile?.name })
  }

  const staffProfile = await ensureStaffProfile(user)
  const [staffRecord, questionnaire] = await Promise.all([
    findStaffProfileRecordByUserId(staffProfile.id),
    getStaffQuestionnaire(staffProfile.id),
  ])
  const { staffRecord: reconciledStaffRecord, onboardingComplete } =
    await reconcileStaffOnboardingStatus(staffRecord, questionnaire)
  const destination = getStaffDestination(onboardingComplete)

  const result = {
    user,
    staffProfile,
    staffRecord: reconciledStaffRecord,
    questionnaire,
    onboardingComplete,
    destination,
  }

  writeStaffBootstrapMemory(user.id, result)
  writeStaffBootstrapCache(user.id, result)

  return result
}

/** Only the youth's assigned worker may edit insights / session summaries. */
export function canStaffEditYouth(youthRow, staffProfileId) {
  if (!youthRow || !staffProfileId) return false
  return String(youthRow.assigned_staff_id || '') === String(staffProfileId)
}

async function fetchLastViewed(staffId, youthIds) {
  if (!youthIds.length) return {}

  const data = await safeOptionalQuery(
    db()
      .from('staff_youth_views')
      .select('youth_id, last_viewed_at, last_schedule_viewed_at')
      .eq('staff_id', staffId)
      .in('youth_id', youthIds),
    'staff_youth_views',
  )

  if (!data) return {}
  return Object.fromEntries(
    data.map((row) => [
      row.youth_id,
      {
        timeline: row.last_viewed_at,
        schedule: row.last_schedule_viewed_at,
      },
    ]),
  )
}

async function upsertStaffYouthViewField(staffId, youthId, field, value) {
  const existing = await safeOptionalQuery(
    db()
      .from('staff_youth_views')
      .select('staff_id')
      .eq('staff_id', staffId)
      .eq('youth_id', youthId)
      .maybeSingle(),
    'staff_youth_views',
  )

  if (existing === null) return

  if (existing) {
    const { error } = await db()
      .from('staff_youth_views')
      .update({ [field]: value })
      .eq('staff_id', staffId)
      .eq('youth_id', youthId)
    if (error) throw error
    return
  }

  const { error } = await db()
    .from('staff_youth_views')
    .insert([{ staff_id: staffId, youth_id: youthId, [field]: value }])

  if (error) throw error
}

async function buildYouthCards(staffId, youthRows) {
  if (!youthRows.length) return []

  const youthIds = youthRows.map((row) => row.id)
  const userIds = youthRows.map((row) => row.user_id)
  const assignedYouthIds = youthRows
    .filter((row) => row.assigned_staff_id === staffId)
    .map((row) => row.id)

  const [profiles, questionnaires, sessions, offlineSessions, insights, messages, lastViewedMap, consultationRequests, reassignmentMap, assignmentStartedMap] =
    await Promise.all([
    db()
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds)
      .then(({ data, error }) => {
        if (error) throw error
        return data
      }),
    db()
      .from('youth_questionnaire')
      .select('*')
      .in('youth_id', youthIds)
      .then(({ data, error }) => {
        if (error) throw error
        return data
      }),
    db()
      .from('ai_chat_sessions')
      .select('youth_id, session_date, mood_check_in, ai_summary, risk_level, crisis_detected, updated_at, created_at')
      .in('youth_id', youthIds)
      .then(({ data, error }) => {
        if (error) throw error
        return data
      }),
    safeOptionalQuery(
      db()
        .from('offline_counselling_sessions')
        .select('youth_id, risk_level, status, session_date, updated_at, approved_at, created_at')
        .in('youth_id', youthIds)
        .eq('status', 'approved'),
      'offline_counselling_sessions',
    ),
    safeOptionalQuery(
      db().from('ai_dynamic_insights').select('*').in('youth_id', youthIds),
      'ai_dynamic_insights',
    ),
    db()
      .from('ai_messages')
      .select('youth_id, sender, message, created_at')
      .in('youth_id', youthIds)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) throw error
        return data
      }),
    fetchLastViewed(staffId, youthIds),
    getConsultationRequestsForStaff(staffId).catch(() => []),
    assignedYouthIds.length > 0
      ? getPendingReassignmentsForYouthIds(assignedYouthIds)
      : Promise.resolve({}),
    assignedYouthIds.length > 0
      ? safeOptionalQuery(
          db()
            .from('assigned_workers')
            .select('youth_id, assigned_at, status')
            .eq('staff_id', staffId)
            .in('youth_id', assignedYouthIds)
            .eq('status', 'active'),
          'assigned_workers',
        )
      : Promise.resolve(null),
  ])

  const allRequests = consultationRequests || []

  const assignmentStartedByYouth = (assignmentStartedMap || []).reduce((acc, row) => {
    if (!acc[row.youth_id] || new Date(row.assigned_at) > new Date(acc[row.youth_id])) {
      acc[row.youth_id] = row.assigned_at
    }
    return acc
  }, {})

  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  const questionnaireMap = Object.fromEntries((questionnaires || []).map((q) => [q.youth_id, q]))
  const sessionsMap = youthIds.reduce((acc, id) => {
    acc[id] = (sessions || []).filter((s) => s.youth_id === id)
    return acc
  }, {})
  const offlineSessionsMap = youthIds.reduce((acc, id) => {
    acc[id] = (offlineSessions || []).filter((s) => s.youth_id === id)
    return acc
  }, {})
  const insightsMap = Object.fromEntries((insights || []).map((i) => [i.youth_id, i]))
  const messagesMap = youthIds.reduce((acc, id) => {
    acc[id] = (messages || []).filter((m) => m.youth_id === id)
    return acc
  }, {})

  return youthRows.map((row) => {
    const viewState = lastViewedMap[row.id] || {}
    const pendingReassignment = reassignmentMap?.[row.id]
    const card = mapYouthCard(
      row,
      profileMap[row.user_id],
      questionnaireMap[row.id],
      sessionsMap[row.id],
      offlineSessionsMap[row.id],
      insightsMap[row.id],
      messagesMap[row.id],
      viewState.timeline,
      hasPendingYouthScheduleRequest(allRequests, row.id),
      resolveUnreadStaffMeetingResponse(allRequests, row.id, viewState.schedule),
    )

    if (pendingReassignment && shouldShowPendingReassignment(row, pendingReassignment, assignmentStartedByYouth[row.id])) {
      card.pendingReassignment = {
        id: pendingReassignment.id,
        reason: pendingReassignment.reason,
        createdAt: pendingReassignment.created_at,
      }
    }

    return card
  })
}

/** Pending youth cards use the same risk/insights logic as assigned cards. */
export async function loadPendingYouth(staffId) {
  console.log('Loading pending youth...')

  const { data, error } = await db()
    .from('youth_profiles')
    .select('*')
    .is('assigned_staff_id', null)

  console.log('Pending youth query response data:', data)
  console.log('Pending youth query error:', error)

  if (error) {
    return {
      pending: [],
      error,
      rawRows: [],
      buildError: null,
    }
  }

  const rawRows = data || []
  let pending = []
  let buildError = null

  if (staffId && rawRows.length) {
    try {
      pending = await buildYouthCards(staffId, rawRows)
    } catch (err) {
      console.error('[staff] pending youth card build failed:', err)
      buildError = err
      pending = rawRows.map((row) => ({
        id: row.id,
        name: row.preferred_name || 'Youth',
        nameLine: row.preferred_name || 'Youth',
        riskLevel: 'low',
        currentConcern: '—',
        casePreview: '—',
        currentStateDisplay: '—',
        latestInteractionInsight: '—',
        lastActivityDisplay: '—',
      }))
    }
  }

  console.log('Pending youth mapped cards:', pending)

  return {
    pending,
    error: null,
    rawRows,
    buildError,
  }
}

export async function getStaffDashboard(existingSession = null) {
  let staffProfile

  if (existingSession?.staffProfile) {
    staffProfile = existingSession.staffProfile
  } else {
    const boot = await bootstrapStaffSession()
    staffProfile = boot.staffProfile
  }

  const pendingResult = await loadPendingYouth(staffProfile.id)

  const { data: assignedRows, error: assignedError } = await db()
    .from('youth_profiles')
    .select('*')
    .eq('assigned_staff_id', staffProfile.id)
    .eq('assignment_status', 'assigned')

  if (assignedError) throw assignedError

  const assigned = await buildYouthCards(staffProfile.id, assignedRows || [])

  return {
    staff: staffProfile,
    assigned: sortByRisk(assigned),
    pending: pendingResult.pending,
    pendingDebug: {
      error: pendingResult.error?.message || pendingResult.error?.details || null,
      buildError: pendingResult.buildError?.message || null,
      rawCount: pendingResult.rawRows.length,
      isEmpty: !pendingResult.error && pendingResult.rawRows.length === 0,
    },
  }
}

export async function assignYouthToMe(youthId) {
  const { staffProfile } = await bootstrapStaffSession()

  const { data: existing, error: readError } = await db()
    .from('youth_profiles')
    .select('id, assigned_staff_id, assignment_status')
    .eq('id', youthId)
    .maybeSingle()

  if (readError) throw readError
  if (!existing) throw new Error('Youth not found.')

  if (existing.assigned_staff_id && existing.assigned_staff_id !== staffProfile.id) {
    throw new Error('This youth has already been assigned to another staff.')
  }

  if (existing.assigned_staff_id === staffProfile.id && existing.assignment_status === 'assigned') {
    return existing
  }

  // Pool reclaim: past reassignment history should not affect a fresh assignment.
  await closePendingReassignmentForYouth(youthId).catch((error) => {
    console.warn('[staff] clear pending reassignment before assign failed:', error.message)
  })

  const now = new Date().toISOString()

  const { data: updated, error } = await db()
    .from('youth_profiles')
    .update({
      assigned_staff_id: staffProfile.id,
      assignment_status: 'assigned',
      updated_at: now,
    })
    .eq('id', youthId)
    .is('assigned_staff_id', null)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!updated) {
    throw new Error('This youth has already been assigned to another staff.')
  }

  const { data: reactivatedWorker, error: workerError } = await db()
    .from('assigned_workers')
    .update({ status: 'active', assigned_at: now })
    .eq('youth_id', youthId)
    .eq('staff_id', staffProfile.id)
    .select('id')
    .maybeSingle()

  if (workerError && !isMissingTableError(workerError)) {
    console.warn('[staff] assigned_workers reactivate failed:', workerError.message)
  } else if (!reactivatedWorker) {
    const { error: insertWorkerError } = await db().from('assigned_workers').insert([
      {
        youth_id: youthId,
        staff_id: staffProfile.id,
        status: 'active',
        assigned_at: now,
      },
    ])
    if (insertWorkerError && !insertWorkerError.message?.includes('duplicate')) {
      throw insertWorkerError
    }
  }

  await closePendingReassignmentForYouth(youthId).catch((error) => {
    console.warn('[staff] clear pending reassignment after assign failed:', error.message)
  })

  return updated
}

export async function releaseYouthCase(youthId) {
  const { staffProfile } = await bootstrapStaffSession()

  const { data: existing, error: readError } = await db()
    .from('youth_profiles')
    .select('id, assigned_staff_id, assignment_status')
    .eq('id', youthId)
    .maybeSingle()

  if (readError) throw readError
  if (!existing) throw new Error('Youth not found.')

  if (existing.assigned_staff_id !== staffProfile.id) {
    throw new Error('Only the assigned worker can release this case.')
  }

  const { data: updated, error } = await db()
    .from('youth_profiles')
    .update({
      assigned_staff_id: null,
      assignment_status: 'pending',
    })
    .eq('id', youthId)
    .eq('assigned_staff_id', staffProfile.id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!updated) {
    throw new Error('Unable to release this case. Please try again.')
  }

  await db()
    .from('assigned_workers')
    .update({ status: 'inactive' })
    .eq('youth_id', youthId)
    .eq('staff_id', staffProfile.id)
    .then(({ error: workerError }) => {
      if (workerError && !isMissingTableError(workerError)) {
        console.warn('[staff] assigned_workers release update failed:', workerError.message)
      }
    })

  await closePendingReassignmentForYouth(youthId).catch((error) => {
    console.warn('[staff] reassignment close failed:', error.message)
  })

  return updated
}

export async function markYouthTimelineViewed(youthId) {
  try {
    const { staffProfile } = await bootstrapStaffSession({ preferCache: true })
    const now = new Date().toISOString()
    await upsertStaffYouthViewField(staffProfile.id, youthId, 'last_viewed_at', now)
  } catch (error) {
    if (isMissingTableError(error)) return
    console.warn('[staff] mark timeline viewed failed:', error.message)
  }
}

export async function markYouthScheduleViewed(youthId) {
  try {
    const { staffProfile } = await bootstrapStaffSession({ preferCache: true })
    const now = new Date().toISOString()
    await upsertStaffYouthViewField(staffProfile.id, youthId, 'last_schedule_viewed_at', now)
  } catch (error) {
    if (isMissingTableError(error)) return
    console.warn('[staff] mark schedule viewed failed:', error.message)
  }
}

export async function getYouthDetail(youthId) {
  const { staffProfile } = await bootstrapStaffSession()

  const { data: youthRow, error: youthError } = await db()
    .from('youth_profiles')
    .select('*')
    .eq('id', youthId)
    .maybeSingle()

  if (youthError) throw youthError
  if (!youthRow) throw new Error('Youth not found')

  const canRead =
    youthRow.assigned_staff_id === staffProfile.id || youthRow.assigned_staff_id == null

  if (!canRead) throw new Error('You do not have access to this youth profile.')

  let questionnaire = null
  try {
    questionnaire = await getQuestionnaire(youthId)
  } catch (error) {
    console.warn('[staff] questionnaire load failed:', error.message)
  }

  const [profileRow, aiSessions, offlineSessions, insights] = await Promise.all([
    safeOptionalQuery(
      db().from('profiles').select('*').eq('id', youthRow.user_id).maybeSingle(),
      'profiles',
    ),
    db()
      .from('ai_chat_sessions')
      .select('*')
      .eq('youth_id', youthId)
      .order('session_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error
        return data
      }),
    safeOptionalQuery(
      db()
        .from('offline_counselling_sessions')
        .select('*')
        .eq('youth_id', youthId)
        .order('session_date', { ascending: false }),
      'offline_counselling_sessions',
    ),
    safeOptionalQuery(
      db().from('ai_dynamic_insights').select('*').eq('youth_id', youthId).maybeSingle(),
      'ai_dynamic_insights',
    ),
  ])

  const displayName =
    youthRow.preferred_name || profileRow?.display_name || profileRow?.email?.split('@')[0] || 'Youth'

  let mergedInsights = insights || null
  try {
    const { insights: loaded } = await loadYouthInsights(db(), youthId, displayName)
    if (loaded && Object.keys(loaded).length) mergedInsights = loaded
  } catch (error) {
    console.warn('[staff] merged insights load failed:', error.message)
  }

  const approvedOffline = (offlineSessions || []).filter((s) => s.status === 'approved')

  return {
    youth: youthRow,
    profile: profileRow,
    name: displayName,
    questionnaire: questionnaire || { ...EMPTY_QUESTIONNAIRE },
    insights:
      mergedInsights ||
      {
        current_state: [],
        risk_level: resolveYouthRiskLevel({
          insights: null,
          aiSessions: aiSessions || [],
          offlineSessions: approvedOffline,
        }),
        main_risk: [],
        best_communication_approach: [],
        latest_change: '',
        overall_summary: '',
      },
    aiSessions: (aiSessions || []).map((s) => ({ ...s, type: 'ai' })),
    offlineSessions: (offlineSessions || []).map((s) => ({ ...s, type: 'offline' })),
    staffTablesReady: offlineSessions !== null,
    isAssigned: youthRow.assigned_staff_id === staffProfile.id,
    isPending: youthRow.assigned_staff_id == null,
    canEdit: youthRow.assigned_staff_id === staffProfile.id,
    usingMock: false,
  }
}

export { RISK_ORDER, sortByRisk }
