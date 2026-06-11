import { requireInsforge } from '../lib/insforgeClient'
import { findProfileByAuthUserId, createProfile, resolveDisplayNameFromUser } from '../lib/profileService'
import { RISK_ORDER, sortByRisk } from '../lib/staffMockData'
import { EMPTY_QUESTIONNAIRE, getQuestionnaire } from './questionnaireService'

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

function pickRiskLevel(sessions, insights) {
  if (insights?.risk_level) return insights.risk_level
  const levels = (sessions || []).map((s) => s.risk_level).filter(Boolean)
  if (levels.includes('high')) return 'high'
  if (levels.includes('medium')) return 'medium'
  return 'low'
}

function mapYouthCard(youthRow, profileRow, questionnaire, sessions, insights, lastViewed) {
  const latestSession = (sessions || []).sort(
    (a, b) => new Date(b.updated_at || b.session_date) - new Date(a.updated_at || a.session_date),
  )[0]
  const hasNew = Boolean(
    latestSession &&
      (!lastViewed || new Date(latestSession.updated_at || latestSession.created_at) > new Date(lastViewed)),
  )

  return {
    id: youthRow.id,
    userId: profileRow?.id,
    name: youthRow.preferred_name || profileRow?.display_name || profileRow?.email?.split('@')[0] || 'Youth',
    email: profileRow?.email || '',
    onboardingCompleted: Boolean(youthRow.onboarding_completed),
    riskLevel: pickRiskLevel(sessions, insights),
    hasNew,
    currentChallenges: questionnaire?.current_challenges || [],
    challengesLabel: youthRow.onboarding_completed
      ? (questionnaire?.current_challenges || []).join(', ') || 'Questionnaire completed'
      : 'Questionnaire not completed yet',
    aiSummary: latestSession?.ai_summary || insights?.latest_change || 'No AI summary yet.',
    assignmentStatus: youthRow.assignment_status,
    assignedStaffId: youthRow.assigned_staff_id,
  }
}

export async function getCurrentAuthUser() {
  const { data, error } = await requireInsforge().auth.getCurrentUser()
  if (error) throw error
  return data?.user ?? null
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
  if (profile) return profile

  profile = await createProfile({
    authUserId: user.id,
    email,
    role: 'staff',
    displayName,
  })
  return profile
}

export async function bootstrapStaffSession() {
  const insforge = requireInsforge()
  const user = await requireStaffUser()

  if (user.profile?.role !== 'staff') {
    await insforge.auth.setProfile({ role: 'staff', email: user.email, name: user.profile?.name })
  }

  const staffProfile = await ensureStaffProfile(user)
  return { user, staffProfile }
}

async function fetchLastViewed(staffId, youthIds) {
  if (!youthIds.length) return {}

  const data = await safeOptionalQuery(
    db()
      .from('staff_youth_views')
      .select('youth_id, last_viewed_at')
      .eq('staff_id', staffId)
      .in('youth_id', youthIds),
    'staff_youth_views',
  )

  if (!data) return {}
  return Object.fromEntries(data.map((row) => [row.youth_id, row.last_viewed_at]))
}

async function buildYouthCards(staffId, youthRows) {
  if (!youthRows.length) return []

  const youthIds = youthRows.map((row) => row.id)
  const userIds = youthRows.map((row) => row.user_id)

  const [profiles, questionnaires, sessions, insights, lastViewedMap] = await Promise.all([
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
      .select('*')
      .in('youth_id', youthIds)
      .then(({ data, error }) => {
        if (error) throw error
        return data
      }),
    safeOptionalQuery(
      db().from('ai_dynamic_insights').select('*').in('youth_id', youthIds),
      'ai_dynamic_insights',
    ),
    fetchLastViewed(staffId, youthIds),
  ])

  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  const questionnaireMap = Object.fromEntries((questionnaires || []).map((q) => [q.youth_id, q]))
  const sessionsMap = youthIds.reduce((acc, id) => {
    acc[id] = (sessions || []).filter((s) => s.youth_id === id)
    return acc
  }, {})
  const insightsMap = Object.fromEntries((insights || []).map((i) => [i.youth_id, i]))

  return youthRows.map((row) =>
    mapYouthCard(
      row,
      profileMap[row.user_id],
      questionnaireMap[row.id],
      sessionsMap[row.id],
      insightsMap[row.id],
      lastViewedMap[row.id],
    ),
  )
}

function mapPendingYouthRow(row) {
  return {
    id: row.id,
    name: row.preferred_name || 'Youth',
    assignmentStatus: row.assignment_status,
    riskLevel: 'low',
    aiSummary: 'No AI summary yet.',
    challengesLabel: 'No challenges recorded yet.',
  }
}

/** Minimal pending query — youth_profiles only, no joins, no staff filter. */
export async function loadPendingYouth() {
  console.log('Loading pending youth...')

  const { data, error } = await db().from('youth_profiles').select('*').is('assigned_staff_id', null)

  console.log('Pending youth query response data:', data)
  console.log('Pending youth query error:', error)

  if (error) {
    return {
      pending: [],
      error,
      rawRows: [],
    }
  }

  const rawRows = data || []
  const pending = rawRows.map(mapPendingYouthRow)

  console.log('Pending youth mapped cards:', pending)

  return {
    pending,
    error: null,
    rawRows,
  }
}

export async function getStaffDashboard() {
  const { staffProfile } = await bootstrapStaffSession()

  const pendingResult = await loadPendingYouth()

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

  const { data: updated, error } = await db()
    .from('youth_profiles')
    .update({
      assigned_staff_id: staffProfile.id,
      assignment_status: 'assigned',
    })
    .eq('id', youthId)
    .is('assigned_staff_id', null)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!updated) {
    throw new Error('This youth has already been assigned to another staff.')
  }

  const { error: workerError } = await db().from('assigned_workers').insert([
    {
      youth_id: youthId,
      staff_id: staffProfile.id,
      status: 'active',
    },
  ])

  if (workerError && !workerError.message?.includes('duplicate')) {
    throw workerError
  }

  return updated
}

export async function markYouthViewed(youthId) {
  try {
    const { staffProfile } = await bootstrapStaffSession()
    const now = new Date().toISOString()

    const existing = await safeOptionalQuery(
      db()
        .from('staff_youth_views')
        .select('staff_id')
        .eq('staff_id', staffProfile.id)
        .eq('youth_id', youthId)
        .maybeSingle(),
      'staff_youth_views',
    )

    if (existing === null) return

    if (existing) {
      await db()
        .from('staff_youth_views')
        .update({ last_viewed_at: now })
        .eq('staff_id', staffProfile.id)
        .eq('youth_id', youthId)
    } else {
      await db().from('staff_youth_views').insert([
        { staff_id: staffProfile.id, youth_id: youthId, last_viewed_at: now },
      ])
    }
  } catch (error) {
    if (isMissingTableError(error)) return
    console.warn('[staff] mark viewed skipped:', error.message)
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

  await markYouthViewed(youthId)

  return {
    youth: youthRow,
    profile: profileRow,
    name: youthRow.preferred_name || profileRow?.display_name || profileRow?.email?.split('@')[0] || 'Youth',
    questionnaire: questionnaire || { ...EMPTY_QUESTIONNAIRE },
    insights: insights || {
      current_state: [],
      risk_level: pickRiskLevel(aiSessions, null),
      main_risk: [],
      best_communication_approach: [],
      latest_change: '',
    },
    aiSessions: (aiSessions || []).map((s) => ({ ...s, type: 'ai' })),
    offlineSessions: (offlineSessions || []).map((s) => ({ ...s, type: 'offline' })),
    staffTablesReady: offlineSessions !== null,
    isAssigned: youthRow.assigned_staff_id === staffProfile.id,
    isPending: youthRow.assigned_staff_id == null,
    usingMock: false,
  }
}

export { RISK_ORDER, sortByRisk }
