import { buildDriftSeries, computeQuietSignal } from '../lib/quietSignal'
import { buildQuietSignalCaseload } from '../lib/quietSignalMockData'
import { getInsforge } from '../lib/insforgeClient'
import { bootstrapStaffSession } from './staffService'

// The Quiet Signal — staff-facing caseload drift.
//
// Returns the youth whose Quiet Signal is trending up (watch/amber only —
// steady youth never surface, so the worker isn't flooded). Highest drift first.
//
// Two paths:
//   1. REAL (P2): read the staff's assigned youths + their persisted drift_*
//      snapshot from ai_chat_sessions (written by the youth-ai-chat edge fn),
//      plus the last 14 days of drift_score for a sparkline.
//   2. MOCK (fallback): if there's no backend, the drift_* columns/tables are
//      missing, or the read is empty, score the seeded demo caseload through the
//      real scorer so the demo never breaks.

const DAY_MS = 24 * 60 * 60 * 1000

function isMissingTableError(error) {
  if (!error) return false
  const message = String(error.message || error.details || error.hint || '').toLowerCase()
  const status = error.status ?? error.statusCode
  return (
    status === 404 ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('column') ||
    (message.includes('relation') && message.includes('exist'))
  )
}

function localDayKey(date) {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function resolveYouthName(youthRow, profileRow) {
  return (
    youthRow?.preferred_name ||
    profileRow?.display_name ||
    profileRow?.email?.split('@')[0] ||
    'Youth'
  )
}

// Build a 14-day sparkline from per-day drift_score rows. Falls back to a flat
// series of the latest score when per-day data is sparse (so the line still
// renders rather than collapsing to a single point).
function buildSeriesFromSessions(sessions, latestScore, now = new Date()) {
  const byDay = new Map()
  for (const s of sessions) {
    if (s.drift_score == null || !s.session_date) continue
    byDay.set(s.session_date, Number(s.drift_score))
  }

  const out = []
  let last = 0
  let any = false
  for (let i = 13; i >= 0; i -= 1) {
    const day = localDayKey(new Date(new Date(now).setHours(0, 0, 0, 0) - i * DAY_MS))
    if (byDay.has(day)) {
      last = byDay.get(day)
      any = true
    }
    out.push(last)
  }

  // Sparse data → flat series at the latest score so the sparkline still reads.
  if (!any) return Array(14).fill(latestScore ?? 0)
  return out
}

// Real-data path. Returns an array of caseload items in the panel's shape, or
// null to signal "fall back to mock" (no backend, missing columns, or empty).
async function loadRealCaseloadDrift() {
  const insforge = getInsforge()
  if (!insforge) return null

  let staffProfile
  try {
    ;({ staffProfile } = await bootstrapStaffSession())
  } catch {
    return null
  }
  if (!staffProfile?.id) return null

  const db = insforge.database

  // Assigned youths for this staff member.
  const { data: youthRows, error: youthError } = await db
    .from('youth_profiles')
    .select('id, preferred_name, user_id, assigned_staff_id, assignment_status')
    .eq('assigned_staff_id', staffProfile.id)
    .eq('assignment_status', 'assigned')

  if (youthError) {
    if (isMissingTableError(youthError)) return null
    throw youthError
  }
  if (!youthRows?.length) return null

  const youthIds = youthRows.map((row) => row.id)
  const userIds = youthRows.map((row) => row.user_id)

  // Names + all sessions carrying drift snapshots.
  const [profilesRes, sessionsRes] = await Promise.all([
    db.from('profiles').select('id, display_name, email').in('id', userIds),
    db
      .from('ai_chat_sessions')
      .select('youth_id, session_date, drift_score, drift_tier, drift_signals, drift_computed_at')
      .in('youth_id', youthIds)
      .order('session_date', { ascending: false }),
  ])

  if (sessionsRes.error) {
    // Missing drift_* columns (migration not applied) → graceful mock fallback.
    if (isMissingTableError(sessionsRes.error)) return null
    throw sessionsRes.error
  }
  if (profilesRes.error && !isMissingTableError(profilesRes.error)) throw profilesRes.error

  const profileMap = Object.fromEntries((profilesRes.data || []).map((p) => [p.id, p]))
  const youthMap = Object.fromEntries(youthRows.map((y) => [y.id, y]))

  const sessionsByYouth = youthIds.reduce((acc, id) => {
    acc[id] = []
    return acc
  }, {})
  for (const s of sessionsRes.data || []) {
    if (sessionsByYouth[s.youth_id]) sessionsByYouth[s.youth_id].push(s)
  }

  const items = []
  let scoredAny = false
  for (const youthId of youthIds) {
    const sessions = sessionsByYouth[youthId] || []
    // Most recent session row that actually carries a drift snapshot.
    const latest = sessions.find((s) => s.drift_score != null)
    if (!latest) continue
    scoredAny = true

    const youthRow = youthMap[youthId]
    const profileRow = profileMap[youthRow?.user_id]

    items.push({
      youthId,
      youthName: resolveYouthName(youthRow, profileRow),
      explicitRisk: 'low', // Quiet Signal contrasts with explicit per-message risk.
      score: Number(latest.drift_score),
      tier: latest.drift_tier || 'steady',
      signals: Array.isArray(latest.drift_signals) ? latest.drift_signals : [],
      window: { days: 14 },
      series: buildSeriesFromSessions(sessions, Number(latest.drift_score)),
    })
  }

  // No youth has a persisted snapshot yet → let the mock carry the demo.
  if (!scoredAny) return null

  return items
}

// Mock path: score the seeded demo caseload through the real deterministic
// scorer so the panel demos with zero backend dependency.
function loadMockCaseloadDrift() {
  const now = new Date()
  const caseload = buildQuietSignalCaseload(now)
  return caseload.map((youth) => {
    const result = computeQuietSignal(youth, { now })
    return {
      youthId: youth.id,
      youthName: youth.name,
      explicitRisk: youth.explicitRisk,
      score: result.score,
      tier: result.tier,
      signals: result.signals,
      window: result.window,
      series: buildDriftSeries(youth, { now }),
    }
  })
}

export async function getCaseloadDrift() {
  let items = null
  try {
    items = await loadRealCaseloadDrift()
  } catch (error) {
    // Never break the panel on a backend hiccup — fall through to mock.
    console.warn('[quiet-signal] real caseload read failed, using mock:', error?.message || error)
    items = null
  }

  // Graceful fallback so the demo never breaks.
  if (!items || items.length === 0) {
    items = loadMockCaseloadDrift()
  }

  return items
    .filter((y) => y.tier !== 'steady')
    .sort((a, b) => b.score - a.score)
}
