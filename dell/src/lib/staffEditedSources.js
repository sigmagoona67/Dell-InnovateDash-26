/** Build staff-edited payload for AI regen — locked prompts treat these as primary sources. */

function editedAt(meta, key) {
  return Boolean(meta && meta[key])
}

export function buildInsightStaffEditedSources(insights = {}) {
  if (!insights || typeof insights !== 'object') return null

  const meta = insights.staff_edited_fields || {}
  const sources = {}

  if (editedAt(meta, 'overall_summary') && String(insights.overall_summary || '').trim()) {
    sources.overall_summary = String(insights.overall_summary).trim()
  }
  if (editedAt(meta, 'current_state') && (insights.current_state || []).length) {
    sources.current_state = insights.current_state
  }
  if (editedAt(meta, 'main_risk') && (insights.main_risk || []).length) {
    sources.main_risk = insights.main_risk
  }
  if (editedAt(meta, 'best_communication_approach') && (insights.best_communication_approach || []).length) {
    sources.best_communication_approach = insights.best_communication_approach
  }
  if (editedAt(meta, 'latest_change') && String(insights.latest_change || '').trim()) {
    sources.latest_change = String(insights.latest_change).trim()
  }
  if (editedAt(meta, 'current_concern') && String(insights.current_concern || '').trim()) {
    sources.current_concern = String(insights.current_concern).trim()
  }
  if (editedAt(meta, 'case_preview') && String(insights.case_preview || '').trim()) {
    sources.case_preview = String(insights.case_preview).trim()
  }

  const dynamic = insights.dynamic_profile || {}
  const dynamicEdits = {}
  for (const key of [
    'interests',
    'personality',
    'preferred_communication_style',
    'living_arrangement',
    'current_challenges',
    'coping_methods',
  ]) {
    const metaKey = `dynamic_profile.${key}`
    if (!editedAt(meta, metaKey)) continue
    const value = dynamic[key]
    if (Array.isArray(value) ? value.length : String(value || '').trim()) {
      dynamicEdits[key] = value
    }
  }
  if (Object.keys(dynamicEdits).length) sources.dynamic_profile = dynamicEdits

  return Object.keys(sources).length ? sources : null
}

export function buildSessionStaffEditedSources(sessions = [], { field = 'ai_summary' } = {}) {
  const edited = (sessions || [])
    .filter((s) => s?.staff_edited_fields?.[field] && String(s[field] || '').trim())
    .map((s) => ({
      session_date: s.session_date,
      [field]: String(s[field]).trim(),
    }))
  return edited.length ? edited : null
}

export function hasStaffEditedSources(insights, aiSessions = [], offlineSessions = []) {
  return Boolean(
    buildInsightStaffEditedSources(insights) ||
      buildSessionStaffEditedSources(aiSessions) ||
      buildSessionStaffEditedSources(offlineSessions),
  )
}
