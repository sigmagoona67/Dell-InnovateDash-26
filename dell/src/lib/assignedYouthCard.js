import { normalizeCareInsights } from './careInsights.js'

function parseTs(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function joinNatural(items) {
  const list = items.filter(Boolean)
  if (!list.length) return ''
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`
}

export function formatStaffActivityTime(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  const timeStr = date.toLocaleString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (date >= startOfToday) return `Today ${timeStr}`
  if (date >= startOfYesterday) return `Yesterday ${timeStr}`
  return date.toLocaleString('en-SG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatCurrentStateDisplay(insights) {
  const care = normalizeCareInsights(insights)
  const items = care.current_state
  if (!items.length) return 'Not enough information yet.'
  const text = joinNatural(items.map((item) => item.charAt(0).toUpperCase() + item.slice(1)))
  return /[.!?]$/.test(text) ? text : `${text}.`
}

export function formatLatestInteractionInsight(insights) {
  const care = normalizeCareInsights(insights)
  const text = String(care.latest_change || '').trim()
  if (!text) return 'No recent interaction insight yet.'
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function collectYouthActivityEvents({ messages = [], sessions = [], offlineSessions = [], insights = null } = {}) {
  const events = []

  for (const msg of messages) {
    if (msg.sender !== 'youth') continue
    const at = parseTs(msg.created_at)
    if (at) events.push({ at, kind: 'ai', source: 'ai_message' })
  }

  for (const session of sessions) {
    const at = parseTs(session.updated_at || session.created_at)
    if (at) events.push({ at, kind: 'ai', source: 'ai_session' })

    if (String(session.ai_summary || '').trim()) {
      const summaryAt = parseTs(session.updated_at || session.created_at || session.session_date)
      if (summaryAt) events.push({ at: summaryAt, kind: 'ai', source: 'ai_summary' })
    }
  }

  for (const offline of offlineSessions) {
    const at = parseTs(offline.approved_at || offline.updated_at || offline.created_at)
    if (at) events.push({ at, kind: 'case', source: 'offline_session' })
  }

  if (insights) {
    const hasInsightPayload =
      asArray(insights.current_state).length ||
      String(insights.latest_change || '').trim() ||
      String(insights.overall_summary || '').trim()
    const at = parseTs(insights.updated_at || insights.approved_at)
    if (at && hasInsightPayload) {
      events.push({ at, kind: 'case', source: 'insights' })
    }
  }

  return events.sort((a, b) => b.at - a.at)
}

function resolveLastActivityLabel({ hasNew, latestUnread, latestOverall }) {
  const pick = hasNew ? latestUnread : latestOverall
  if (!pick) return { label: 'Last Update', kind: 'case' }
  if (hasNew) {
    return pick.kind === 'ai'
      ? { label: 'Last AI Contact', kind: 'ai' }
      : { label: 'Last Update', kind: 'case' }
  }
  return pick.kind === 'ai'
    ? { label: 'Last AI Contact', kind: 'ai' }
    : { label: 'Last Update', kind: 'case' }
}

/** Unread NEW badge + last activity line for assigned youth dashboard cards. */
export function buildAssignedYouthCardMeta({
  messages = [],
  sessions = [],
  offlineSessions = [],
  insights = null,
  lastViewedAt = null,
} = {}) {
  const events = collectYouthActivityEvents({ messages, sessions, offlineSessions, insights })
  const lastViewedTs = parseTs(lastViewedAt)
  const latestOverall = events[0] || null
  const unreadEvents = events.filter((event) => !lastViewedTs || event.at > lastViewedTs)
  const latestUnread = unreadEvents[0] || null
  const hasNew = unreadEvents.length > 0

  const { label: lastActivityLabel } = resolveLastActivityLabel({
    hasNew,
    latestUnread,
    latestOverall,
  })

  const displayEvent = hasNew ? latestUnread : latestOverall
  const lastActivityAt = displayEvent ? new Date(displayEvent.at).toISOString() : null

  return {
    hasNew,
    lastActivityLabel,
    lastActivityAt,
    lastActivityDisplay: formatStaffActivityTime(lastActivityAt),
    latestActivityAt: latestOverall ? new Date(latestOverall.at).toISOString() : null,
  }
}

export function formatYouthNameLine(name, age) {
  const displayName = String(name || 'Youth').trim() || 'Youth'
  const ageValue = age != null && String(age).trim() !== '' ? String(age).trim() : null
  return ageValue ? `${displayName} · ${ageValue}` : displayName
}
