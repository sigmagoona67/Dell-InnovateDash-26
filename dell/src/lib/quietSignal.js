// The Quiet Signal — a deterministic, explainable early-warning score.
//
// Unlike the per-message LLM risk check (low/medium/high on what a youth SAYS),
// this reads the TRAJECTORY of how a youth writes and whether they engage,
// over a rolling window. Every point in the score traces back to a word count
// or an engagement fact — no black box. It is an ADDITIVE early signal, fully
// decoupled from acute risk_alerts: it can only raise a worker's attention,
// never lower an existing alert.
//
// Research anchors (population-level markers, used for triage prioritisation,
// not diagnosis):
//  - Absolutist language: Al-Mosaiwi & Johnstone, Clinical Psych Science 2018
//  - First-person-singular pronouns: pronoun/depression meta-analyses
//  - Social withdrawal: 24-hour adolescent suicide warning-signs (Psych Med 2023)

// LIWC-style absolutist dictionary (the ~19 words shown to track affective severity).
const ABSOLUTIST = new Set([
  'absolutely', 'all', 'always', 'complete', 'completely', 'constant',
  'constantly', 'definitely', 'entire', 'entirely', 'ever', 'every',
  'everyone', 'everything', 'full', 'must', 'never', 'nothing', 'totally',
  'whole',
])

// First-person singular markers (contractions normalised to letters-only).
const FIRST_PERSON = new Set([
  'i', 'me', 'my', 'mine', 'myself', 'im', 'id', 'ill', 'ive',
])

// Youth mood labels → 1 (worst) .. 5 (best). Mirrors the app's check-in scale.
const MOOD_SCORE = { Good: 5, Okay: 4, Sad: 2, Stressed: 2, Overwhelmed: 1 }

// Per-signal weights (sum = 100). Withdrawal + absolutist carry the most weight:
// they are the markers most specific to deterioration in the literature.
const WEIGHTS = { absolutist: 25, selfFocus: 15, brevity: 20, mood: 15, withdrawal: 25 }

const clamp01 = (n) => Math.max(0, Math.min(1, n))
const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Local-calendar day key 'YYYY-MM-DD' (NOT UTC) so message timestamps and
// session_date values land on the same day regardless of timezone.
function dayKey(date) {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Letters-only tokens, lowercased. "I'm" -> "im", strips punctuation.
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z]/g, ''))
    .filter(Boolean)
}

function moodToScore(label) {
  return MOOD_SCORE[label] ?? null
}

// Least-squares slope of a (dayIndex, value) series; negative = trending down.
function linearSlope(points) {
  const n = points.length
  if (n < 2) return 0
  const sx = points.reduce((s, p) => s + p.x, 0)
  const sy = points.reduce((s, p) => s + p.y, 0)
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0)
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return 0
  return (n * sxy - sx * sy) / denom
}

/**
 * Compute the Quiet Signal for one youth.
 * @param {{messages: Array, sessions: Array}} data
 *   messages: [{ sender: 'youth'|'ai'|'system', message, created_at }]
 *   sessions: [{ session_date: 'YYYY-MM-DD', mood_check_in }]
 * @param {{ now?: Date, windowDays?: number }} opts
 * @returns {{ score, tier, signals, window }}
 */
export function computeQuietSignal(data, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date()
  const windowDays = opts.windowDays ?? 14
  const windowStart = startOfDay(now).getTime() - (windowDays - 1) * DAY_MS
  const nowMs = now.getTime()

  const inWindow = (ts) => {
    const t = new Date(ts).getTime()
    return t >= windowStart && t <= nowMs
  }

  const messages = (data.messages || []).filter((m) => m.created_at && inWindow(m.created_at))
  const sessions = (data.sessions || []).filter(
    (s) => s.session_date && inWindow(`${s.session_date}T12:00:00`),
  )

  const youthMsgs = messages
    .filter((m) => m.sender === 'youth')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  // ---- Linguistic signals (over youth-authored text) ----
  const allTokens = youthMsgs.flatMap((m) => tokenize(m.message))
  const tokenCount = allTokens.length
  const absCount = allTokens.filter((t) => ABSOLUTIST.has(t)).length
  const fpCount = allTokens.filter((t) => FIRST_PERSON.has(t)).length

  const absRatio = tokenCount ? absCount / tokenCount : 0
  const fpRatio = tokenCount ? fpCount / tokenCount : 0

  // Healthy baselines ~1.5% absolutist / ~5% first-person; scale up from there.
  const absContribution = clamp01((absRatio - 0.015) / 0.045)
  const fpContribution = clamp01((fpRatio - 0.05) / 0.06)

  // ---- Brevity collapse: recent message length vs the youth's own baseline ----
  const lens = youthMsgs.map((m) => tokenize(m.message).length)
  let brevityContribution = 0
  let brevityDrop = 0
  if (lens.length >= 4) {
    const recent = lens.slice(-3)
    const baseline = lens.slice(0, -3)
    const avg = (arr) => arr.reduce((s, n) => s + n, 0) / arr.length
    const baseAvg = avg(baseline)
    const recentAvg = avg(recent)
    if (baseAvg > 0) {
      brevityDrop = clamp01((baseAvg - recentAvg) / baseAvg)
      brevityContribution = clamp01(brevityDrop / 0.5) // 50% shorter = max
    }
  }

  // ---- Mood slope (per day) ----
  const moodPoints = sessions
    .map((s) => ({ key: s.session_date, y: moodToScore(s.mood_check_in) }))
    .filter((p) => p.y != null)
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((p, i) => ({ x: i, y: p.y }))
  const moodSlope = linearSlope(moodPoints)
  const moodContribution = clamp01(-moodSlope / 0.3) // ~0.3 pts/day decline = max

  // ---- Withdrawal: silence as a signal ----
  // Measured RELATIVE to the youth's own baseline, so a youth who simply checks
  // in every few days is not mistaken for one who is pulling away. Two markers:
  //   (a) "opened, didn't write" — logged a mood but wrote nothing (strong), and
  //   (b) engagement drop — recent message rate vs their own earlier baseline.
  const youthMsgDayKeys = new Set(youthMsgs.map((m) => dayKey(m.created_at)))
  const openedNoWrite = sessions.filter(
    (s) => s.mood_check_in && !youthMsgDayKeys.has(s.session_date),
  ).length

  const half = Math.floor(windowDays / 2)
  const recentCutoff = startOfDay(now).getTime() - (half - 1) * DAY_MS
  const recentMsgCount = youthMsgs.filter((m) => new Date(m.created_at).getTime() >= recentCutoff).length
  const olderMsgCount = youthMsgs.length - recentMsgCount
  const recentRate = recentMsgCount / half
  const olderRate = olderMsgCount / Math.max(1, windowDays - half)
  const engagementDrop = olderRate > 0 ? clamp01((olderRate - recentRate) / olderRate) : 0

  const withdrawalContribution = clamp01(openedNoWrite * 0.35 + engagementDrop * 0.6)

  // ---- Weighted score ----
  const parts = {
    absolutist: absContribution,
    selfFocus: fpContribution,
    brevity: brevityContribution,
    mood: moodContribution,
    withdrawal: withdrawalContribution,
  }
  let score = Object.entries(parts).reduce((s, [k, v]) => s + v * WEIGHTS[k], 0)

  // Combination rule (mirrors the acute pipeline's fail-high promotion):
  // absolutist thinking + active withdrawal is the high-specificity pairing.
  const combinationFired = absContribution > 0.5 && withdrawalContribution > 0.4
  if (combinationFired) score = Math.min(100, score + 10)

  score = Math.round(clamp01(score / 100) * 100)

  let tier = 'steady'
  if (score >= 55) tier = 'amber'
  else if (score >= 30) tier = 'watch'

  // ---- Build the explainable "why" (only fired signals surface) ----
  const signals = []
  const pushSignal = (key, label, contribution, detail) => {
    if (contribution > 0.12) signals.push({ key, label, detail, contribution })
  }
  pushSignal('absolutist', 'Absolutist language', absContribution,
    `${(absRatio * 100).toFixed(1)}% absolutist words`)
  pushSignal('selfFocus', 'Self-focus', fpContribution,
    `${(fpRatio * 100).toFixed(0)}% first-person`)
  pushSignal('brevity', 'Shorter messages', brevityContribution,
    `messages ↓${Math.round(brevityDrop * 100)}%`)
  pushSignal('mood', 'Mood trending down', moodContribution, 'mood declining')
  pushSignal('withdrawal', 'Withdrawn', withdrawalContribution,
    openedNoWrite > 0
      ? `${openedNoWrite}× opened, didn't write`
      : 'engagement dropping')
  if (combinationFired) {
    signals.push({
      key: 'combination',
      label: 'Absolutist + withdrawal',
      detail: 'high-specificity pairing',
      contribution: 1,
    })
  }
  signals.sort((a, b) => b.contribution - a.contribution)

  return {
    score,
    tier,
    signals,
    window: { days: windowDays, sessions: sessions.length, youthMessages: youthMsgs.length },
  }
}

/**
 * 14-day score series for a sparkline — recomputes the score "as of" each day
 * using only data available up to that day.
 */
export function buildDriftSeries(data, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date()
  const days = opts.days ?? 14
  const windowDays = opts.windowDays ?? 14
  const out = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const asOf = new Date(startOfDay(now).getTime() - i * DAY_MS)
    asOf.setHours(23, 59, 59, 0)
    out.push(computeQuietSignal(data, { now: asOf, windowDays }).score)
  }
  return out
}

export const QUIET_SIGNAL_FACTORS = [
  'Absolutist language',
  'Self-focus (first-person)',
  'Message brevity',
  'Mood slope',
  'Withdrawal / silence',
]
