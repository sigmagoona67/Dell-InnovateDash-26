import { requireInsforge } from '../lib/insforgeClient'
import { sortByRisk } from '../lib/staffMockData'
import { bootstrapStaffSession } from './staffService'
import {
  EMPTY_STAFF_QUESTIONNAIRE,
  getStaffQuestionnaire,
  summarizeInterests,
  summarizePersonality,
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

function pickRiskLevel(sessions, insights) {
  if (insights?.risk_level) return insights.risk_level
  const levels = (sessions || []).map((s) => s.risk_level).filter(Boolean)
  if (levels.includes('high')) return 'high'
  if (levels.includes('medium')) return 'medium'
  return 'low'
}

function displayStaffName(profile) {
  return profile?.display_name || profile?.email?.split('@')[0] || 'Staff member'
}

function mapAssignedYouthSummary(youthRow, profileRow, sessions, insights) {
  return {
    id: youthRow.id,
    name: youthRow.preferred_name || profileRow?.display_name || profileRow?.email?.split('@')[0] || 'Youth',
    riskLevel: pickRiskLevel(sessions, insights),
    onboardingCompleted: Boolean(youthRow.onboarding_completed),
  }
}

export async function getStaffDirectory() {
  const { staffProfile } = await bootstrapStaffSession()

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

  const [{ data: youthRows, error: youthError }, questionnaireResult] = await Promise.all([
    db()
      .from('youth_profiles')
      .select('id, assigned_staff_id, assignment_status')
      .eq('assignment_status', 'assigned')
      .not('assigned_staff_id', 'is', null),
    db()
      .from('staff_questionnaire')
      .select('staff_id, quiz_completed')
      .in('staff_id', staffIds)
      .then(({ data, error }) => {
        if (error) {
          if (isMissingTableError(error)) return []
          throw error
        }
        return data || []
      }),
  ])

  if (youthError) throw youthError

  const questionnaireMap = Object.fromEntries(
    (questionnaireResult || []).map((row) => [row.staff_id, row]),
  )

  const assignedYouth = youthRows || []
  const countByStaff = assignedYouth.reduce((acc, row) => {
    acc[row.assigned_staff_id] = (acc[row.assigned_staff_id] || 0) + 1
    return acc
  }, {})

  // Risk mix per staff — drives the stacked risk bar on each card.
  const riskMixByStaff = {}
  const assignedYouthIds = assignedYouth.map((row) => row.id)
  if (assignedYouthIds.length) {
    const [sessions, insights] = await Promise.all([
      db()
        .from('ai_chat_sessions')
        .select('youth_id, risk_level')
        .in('youth_id', assignedYouthIds)
        .then(({ data, error }) => {
          if (error) {
            if (isMissingTableError(error)) return []
            throw error
          }
          return data || []
        }),
      db()
        .from('ai_dynamic_insights')
        .select('youth_id, risk_level')
        .in('youth_id', assignedYouthIds)
        .then(({ data, error }) => {
          if (error) {
            if (isMissingTableError(error)) return []
            throw error
          }
          return data || []
        }),
    ])

    const sessionsByYouth = sessions.reduce((acc, row) => {
      ;(acc[row.youth_id] = acc[row.youth_id] || []).push(row)
      return acc
    }, {})
    const insightByYouth = Object.fromEntries(insights.map((row) => [row.youth_id, row]))

    for (const row of assignedYouth) {
      const level = pickRiskLevel(sessionsByYouth[row.id], insightByYouth[row.id])
      const mix = (riskMixByStaff[row.assigned_staff_id] =
        riskMixByStaff[row.assigned_staff_id] || { high: 0, medium: 0, low: 0 })
      mix[level] = (mix[level] || 0) + 1
    }
  }

  // Capacity target: shared workload ceiling per worker for the meter.
  const CASELOAD_TARGET = 8

  const staff = staffList
    .map((row) => ({
      id: row.id,
      name: displayStaffName(row),
      email: row.email,
      isSelf: row.id === staffProfile.id,
      assignedYouthCount: countByStaff[row.id] || 0,
      capacityTarget: CASELOAD_TARGET,
      riskMix: riskMixByStaff[row.id] || { high: 0, medium: 0, low: 0 },
      quizCompleted: Boolean(questionnaireMap[row.id]?.quiz_completed),
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
  const { staffProfile } = await bootstrapStaffSession()

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

    const [profiles, sessions, insights] = await Promise.all([
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
    const insightsMap = Object.fromEntries((insights || []).map((row) => [row.youth_id, row]))

    assignedYouth = sortByRisk(
      assignedRows.map((row) =>
        mapAssignedYouthSummary(
          row,
          profileMap[row.user_id],
          sessionsMap[row.id],
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
      personalitySummary: summarizePersonality(questionnaire.personality),
    },
    assignedYouth,
    assignedYouthCount: assignedYouth.length,
  }
}
