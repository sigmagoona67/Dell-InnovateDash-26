import { requireInsforge } from '../lib/insforgeClient'
import { isStaffOnboardingComplete } from '../lib/onboardingRequirements'
import { resolveYouthRiskLevel } from '../lib/riskResolver'
import { sortByRisk } from '../lib/staffMockData'
import { bootstrapStaffSession } from './staffService'
import {
  EMPTY_STAFF_QUESTIONNAIRE,
  getStaffQuestionnaire,
  summarizeInterests,
} from './staffQuestionnaireService'

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

function displayStaffName(profile) {
  return profile?.display_name || profile?.email?.split('@')[0] || 'Staff member'
}

function mapAssignedYouthSummary(youthRow, profileRow, sessions, offlineSessions, insights) {
  return {
    id: youthRow.id,
    name: youthRow.preferred_name || profileRow?.display_name || profileRow?.email?.split('@')[0] || 'Youth',
    riskLevel: resolveYouthRiskLevel({
      insights,
      aiSessions: sessions,
      offlineSessions: offlineSessions || [],
    }),
    onboardingCompleted: Boolean(youthRow.onboarding_completed),
  }
}

export async function getStaffDirectory() {
  const { staffProfile } = await bootstrapStaffSession({ preferCache: true })

  const { data: staffRows, error: staffError } = await db()
    .from('profiles')
    .select('id, display_name, email, created_at')
    .eq('role', 'staff')
    .order('display_name', { ascending: true })

  if (staffError) throw staffError

  const staffList = staffRows || []
  if (!staffList.length) {
    return {
      staff: [],
      totals: { staffCount: 0, assignedYouthCount: 0 },
    }
  }

  const staffIds = staffList.map((row) => row.id)

  const [{ data: youthRows, error: youthError }, staffProfileRows] = await Promise.all([
    db()
      .from('youth_profiles')
      .select('id, assigned_staff_id, assignment_status')
      .eq('assignment_status', 'assigned')
      .not('assigned_staff_id', 'is', null),
    db()
      .from('staff_profiles')
      .select('profile_id, questionnaire_completed')
      .in('profile_id', staffIds)
      .then(({ data, error }) => {
        if (error) {
          if (isMissingTableError(error)) return []
          throw error
        }
        return data || []
      }),
  ])

  if (youthError) throw youthError

  const staffProfileMap = Object.fromEntries(
    (staffProfileRows || []).map((row) => [row.profile_id, row]),
  )

  const assignedYouth = youthRows || []
  const countByStaff = assignedYouth.reduce((acc, row) => {
    acc[row.assigned_staff_id] = (acc[row.assigned_staff_id] || 0) + 1
    return acc
  }, {})

  const staff = staffList
    .map((row) => ({
      id: row.id,
      name: displayStaffName(row),
      email: row.email,
      isSelf: row.id === staffProfile.id,
      assignedYouthCount: countByStaff[row.id] || 0,
      quizCompleted: Boolean(staffProfileMap[row.id]?.questionnaire_completed),
    }))
    .sort((a, b) => {
      if (a.isSelf) return -1
      if (b.isSelf) return 1
      return a.name.localeCompare(b.name)
    })

  return {
    staff,
    totals: {
      staffCount: staff.length,
      assignedYouthCount: assignedYouth.length,
    },
  }
}

export async function getStaffMemberDetail(staffId) {
  const { staffProfile } = await bootstrapStaffSession({ preferCache: true })

  const { data: profileRow, error: profileError } = await db()
    .from('profiles')
    .select('id, display_name, email, role, created_at')
    .eq('id', staffId)
    .eq('role', 'staff')
    .maybeSingle()

  if (profileError) throw profileError
  if (!profileRow) throw new Error('Staff member not found.')

  let questionnaire = { ...EMPTY_STAFF_QUESTIONNAIRE }
  try {
    questionnaire = (await getStaffQuestionnaire(staffId)) || { ...EMPTY_STAFF_QUESTIONNAIRE }
  } catch (error) {
    if (!isMissingTableError(error)) throw error
  }

  const { data: staffRecord, error: staffRecordError } = await db()
    .from('staff_profiles')
    .select('*')
    .eq('profile_id', staffId)
    .maybeSingle()

  if (staffRecordError && !isMissingTableError(staffRecordError)) throw staffRecordError

  const profileComplete = isStaffOnboardingComplete(staffRecord, questionnaire)

  const { data: youthRows, error: youthError } = await db()
    .from('youth_profiles')
    .select('*')
    .eq('assigned_staff_id', staffId)
    .eq('assignment_status', 'assigned')
    .order('preferred_name', { ascending: true })

  if (youthError) throw youthError

  const assignedRows = youthRows || []
  let assignedYouth = []

  if (assignedRows.length) {
    const youthIds = assignedRows.map((row) => row.id)
    const userIds = assignedRows.map((row) => row.user_id)

    const [profiles, sessions, offlineSessions, insights] = await Promise.all([
      db()
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)
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
      db()
        .from('offline_counselling_sessions')
        .select('*')
        .in('youth_id', youthIds)
        .then(({ data, error }) => {
          if (error) {
            if (isMissingTableError(error)) return []
            throw error
          }
          return data || []
        }),
      db()
        .from('ai_dynamic_insights')
        .select('*')
        .in('youth_id', youthIds)
        .then(({ data, error }) => {
          if (error) {
            if (isMissingTableError(error)) return []
            throw error
          }
          return data || []
        }),
    ])

    const profileMap = Object.fromEntries((profiles || []).map((row) => [row.id, row]))
    const sessionsMap = youthIds.reduce((acc, id) => {
      acc[id] = (sessions || []).filter((session) => session.youth_id === id)
      return acc
    }, {})
    const offlineMap = youthIds.reduce((acc, id) => {
      acc[id] = (offlineSessions || []).filter((session) => session.youth_id === id)
      return acc
    }, {})
    const insightsMap = Object.fromEntries((insights || []).map((row) => [row.youth_id, row]))

    assignedYouth = sortByRisk(
      assignedRows.map((row) =>
        mapAssignedYouthSummary(
          row,
          profileMap[row.user_id],
          sessionsMap[row.id],
          offlineMap[row.id],
          insightsMap[row.id],
        ),
      ),
    )
  }

  return {
    staff: {
      id: profileRow.id,
      name: displayStaffName(profileRow),
      email: profileRow.email,
      isSelf: profileRow.id === staffProfile.id,
      memberSince: profileRow.created_at,
    },
    questionnaire: {
      ...questionnaire,
      interestsLabel: summarizeInterests(questionnaire.interests),
      profileComplete,
    },
    assignedYouth,
    assignedYouthCount: assignedYouth.length,
  }
}
