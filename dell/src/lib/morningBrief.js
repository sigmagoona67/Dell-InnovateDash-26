import { resolveAiSessionSummary } from './sessionSummary'

const PRIORITY_STYLES = {
  urgent: 'bg-rose-50 text-rose-800 ring-rose-200',
  soon: 'bg-amber-50 text-amber-800 ring-amber-200',
  routine: 'bg-sky-50 text-sky-800 ring-sky-200',
}

export function resolveMorningBrief({ saved, insights = {}, youthName = 'Youth' }) {
  let brief = saved || insights.morning_brief
  if (typeof brief === 'string') {
    try {
      brief = JSON.parse(brief)
    } catch {
      return null
    }
  }
  if (!brief || typeof brief !== 'object') return null

  const overnight_summary = String(brief.overnight_summary || '').trim()
  if (!overnight_summary) return null

  return {
    overnight_summary,
    follow_up_priority: ['urgent', 'soon', 'routine'].includes(brief.follow_up_priority)
      ? brief.follow_up_priority
      : 'routine',
  }
}

/** One-line preview for staff dashboard / pending cards. */
export function resolveStaffAiSummaryPreview({ insights = {}, sessions = [], youthName = 'Youth' }) {
  const brief = resolveMorningBrief({ insights, youthName })
  if (brief?.overnight_summary) return brief.overnight_summary

  const latestSession = [...(sessions || [])].sort(
    (a, b) => new Date(b.updated_at || b.session_date) - new Date(a.updated_at || a.session_date),
  )[0]
  return latestSession?.ai_summary?.trim() || ''
}

/** Staff AI Summary tab: overnight handoff text only. */
export function resolveOvernightSummaryDisplay({ insights = {}, youthName = 'Youth', session, messages = [] }) {
  const brief = resolveMorningBrief({ insights, youthName })
  if (brief?.overnight_summary) {
    return brief.overnight_summary
  }

  const rawMessages = (messages || []).map((m) => ({
    sender: m.role === 'user' ? 'youth' : 'ai',
    message: m.text,
  }))
  return (
    session?.ai_summary?.trim() ||
    (session && rawMessages.length ? resolveAiSessionSummary(session, rawMessages, youthName) : '')
  )
}

export function priorityLabel(priority) {
  if (priority === 'urgent') return 'Urgent follow-up'
  if (priority === 'soon') return 'Follow up soon'
  return 'Routine check-in'
}

export function priorityClassName(priority) {
  return PRIORITY_STYLES[priority] || PRIORITY_STYLES.routine
}
