// "Year in moods" — a GitHub-contribution-style heatmap where each day is graded
// by mood + AI sentiment of that day's reflection. Makes a youth's trajectory
// legible at a glance (and the Quiet Signal's "drift" visible: the grid cools and
// thins out in recent weeks).
//
// Deliberately NOT GitHub green: a calm DIVERGING scale (warm clay = heavier days
// -> teal = brighter days), grey = no check-in. No red (stigma), no "empty = bad".

const DAY_MS = 24 * 60 * 60 * 1000

// Mood label -> 1 (heaviest) .. 5 (brightest). Matches the app's check-in scale.
const MOOD_GRADE = { Overwhelmed: 1, Stressed: 2, Sad: 2, Okay: 4, Good: 5 }

// Tiny sentiment lexicon — the "AI sentiment" nudge on top of the raw mood.
// (In production the edge function grades each day from the reflection text /
// AI summary; this deterministic version keeps the demo reproducible.)
const POSITIVE = ['good', 'better', 'happy', 'calm', 'proud', 'fun', 'nice', 'okay', 'relaxed', 'hopeful', 'grateful', 'enjoyed', 'looking forward']
const NEGATIVE = ['tired', 'sad', 'low', 'down', 'stressed', 'anxious', 'alone', 'useless', 'never', 'nothing', 'always', 'cant', 'hopeless', 'overwhelmed', 'numb']

function sentimentDelta(text) {
  if (!text) return 0
  const tokens = String(text).toLowerCase().split(/\s+/).map((t) => t.replace(/[^a-z]/g, ''))
  let score = 0
  for (const t of tokens) {
    if (POSITIVE.includes(t)) score += 1
    if (NEGATIVE.includes(t)) score -= 1
  }
  if (score >= 2) return 1
  if (score <= -2) return -1
  return 0
}

// The five canonical mood labels the app writes (AICompanion.recordMood ->
// mood.label). Used to defensively normalise whatever is stored in
// mood_check_in before grading, so the two mapping sites (youth + staff)
// cannot drift apart.
const CANONICAL_MOODS = ['Good', 'Okay', 'Sad', 'Stressed', 'Overwhelmed']
const MOOD_LOOKUP = Object.fromEntries(CANONICAL_MOODS.map((m) => [m.toLowerCase(), m]))

// Trim / case-fold a stored mood value to one of the five canonical labels.
// Returns undefined when the value is missing or unrecognised — callers should
// still keep the entry object (presence) so gradeDay can grade it as PRESENT.
export function normalizeMood(value) {
  if (value == null) return undefined
  const key = String(value).trim().toLowerCase()
  return MOOD_LOOKUP[key]
}

// Grade one day. An entry object means the youth SHOWED UP that day.
// - recognised mood   -> graded 1..5 (refined by sentiment of any text)
// - present but mood unmappable -> grade 3 (PRESENT / "you showed up"),
//   NEVER null. Silently rendering a real check-in as "never showed up" is the
//   worst failure mode for this audience, so presence always beats grey.
// - no entry at all    -> null (genuinely no check-in; rendered grey by caller)
export function gradeDay({ mood, text } = {}) {
  const canonical = normalizeMood(mood)
  const base = MOOD_GRADE[canonical] ?? 3 // present-but-unmappable -> PRESENT
  return Math.max(1, Math.min(5, base + sentimentDelta(text)))
}

export const GRADE_COLORS = {
  0: '#eaeef1', // no check-in (slate-100)
  1: '#e0a07d', // heaviest (warm clay)
  2: '#f1cda3', // heavy (warm sand)
  3: '#d4e3de', // mixed (neutral)
  4: '#8cc6b8', // bright (light teal)
  5: '#3a7d72', // brightest (teal-600)
}

const MOOD_FROM_GRADE = { 1: 'a heavy day', 2: 'a hard day', 3: 'a mixed day', 4: 'an okay day', 5: 'a bright day' }

function localKey(date) {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Build the heatmap grid (columns = weeks Sun..Sat).
 * @param {Object} entriesByDate  map 'YYYY-MM-DD' -> { mood, text }
 * @param {{ now?: Date, weeks?: number }} opts
 * @returns {{ weeks: Array, monthLabels: Array, counts, summary }}
 */
export function buildMoodYear(entriesByDate = {}, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date()
  const weeks = opts.weeks ?? 53
  const today = startOfDay(now)

  // Last column ends this week; first column is `weeks-1` weeks earlier, aligned to Sunday.
  const endSunday = new Date(today.getTime() - today.getDay() * DAY_MS)
  const startSunday = new Date(endSunday.getTime() - (weeks - 1) * 7 * DAY_MS)

  const cols = []
  const monthLabels = []
  let graded = 0
  let gradeSum = 0

  for (let w = 0; w < weeks; w += 1) {
    const colDate = new Date(startSunday.getTime() + w * 7 * DAY_MS)
    monthLabels.push({ col: w, month: colDate.getMonth(), label: MONTHS[colDate.getMonth()], day: colDate.getDate() })

    const days = []
    for (let d = 0; d < 7; d += 1) {
      const cellDate = new Date(startSunday.getTime() + (w * 7 + d) * DAY_MS)
      if (cellDate > today) {
        days.push(null) // future
        continue
      }
      const key = localKey(cellDate)
      const entry = entriesByDate[key]
      const grade = entry ? gradeDay(entry) : 0
      if (grade) {
        graded += 1
        gradeSum += grade
      }
      days.push({
        key,
        date: cellDate,
        grade: grade || 0,
        label: `${MONTHS[cellDate.getMonth()]} ${cellDate.getDate()} · ${grade ? MOOD_FROM_GRADE[grade] : 'no check-in'}`,
      })
    }
    cols.push(days)
  }

  return {
    weeks: cols,
    monthLabels,
    counts: { graded, total: weeks * 7 },
    avgGrade: graded ? gradeSum / graded : 0,
  }
}

// Deterministic mock: a year that tells the Quiet Signal story — healthy and
// well-logged for most of the year, then cooling + thinning in the last ~4 weeks.
export function buildMoodYearMock(now = new Date()) {
  const today = startOfDay(now)
  const entries = {}
  const hash = (n) => (Math.imul(n + 1, 2654435761) >>> 0) % 100

  for (let daysAgo = 0; daysAgo < 364; daysAgo += 1) {
    const date = new Date(today.getTime() - daysAgo * DAY_MS)
    const h = hash(daysAgo)

    // Four phases, newest → oldest, to make the drift legible:
    //   last 3 days  : near-silent (withdrawal), heavy when present
    //   last 3 weeks : warm + thinning (the drift zone)
    //   ~4 weeks ago : starting to slip
    //   rest of year : bright + well-logged
    let present
    let mood
    if (daysAgo <= 3) {
      present = h < 22
      mood = ['Overwhelmed', 'Stressed', 'Sad'][h % 3]
    } else if (daysAgo <= 21) {
      present = h < 48
      mood = ['Overwhelmed', 'Stressed', 'Sad', 'Stressed', 'Sad'][h % 5]
    } else if (daysAgo <= 30) {
      present = h < 66
      mood = ['Sad', 'Okay', 'Stressed', 'Okay', 'Good'][h % 5]
    } else {
      present = h < 80
      mood = ['Good', 'Good', 'Okay', 'Okay', 'Good', 'Okay', 'Sad'][h % 7]
    }

    if (present) entries[localKey(date)] = { mood }
  }
  return entries
}
