import { requireInsforge } from '../lib/insforgeClient'

function db() {
  return requireInsforge().database
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

export async function getOrCreateTodaySession(youthId) {
  const sessionDate = todayDateString()

  const { data: existing, error: existingError } = await db()
    .from('ai_chat_sessions')
    .select('*')
    .eq('youth_id', youthId)
    .eq('session_date', sessionDate)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing

  const { data, error } = await db()
    .from('ai_chat_sessions')
    .insert([
      {
        youth_id: youthId,
        session_date: sessionDate,
        title: `Chat on ${sessionDate}`,
        risk_level: 'low',
      },
    ])
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getSessionMessages(sessionId) {
  const { data, error } = await db()
    .from('ai_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getSessionsForMonth(youthId, year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  const { data, error } = await db()
    .from('ai_chat_sessions')
    .select('*')
    .eq('youth_id', youthId)
    .gte('session_date', start)
    .lt('session_date', end)
    .order('session_date', { ascending: true })

  if (error) throw error
  return data || []
}

const DAY_MS = 24 * 60 * 60 * 1000

// A year (or window) of mood for the "Year in moods" heatmap. One indexed query,
// only the two columns the grid needs. Default ~98 days (~14 weeks) covers the
// youth 90-day default window; pass days~=371 for the full-year opt-in.
export async function getMoodYear(youthId, { now = new Date(), days = 98 } = {}) {
  const start = new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10)

  const { data, error } = await db()
    .from('ai_chat_sessions')
    .select('session_date, mood_check_in')
    .eq('youth_id', youthId)
    .gte('session_date', start)
    .order('session_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getSessionByDate(youthId, sessionDate) {
  const { data, error } = await db()
    .from('ai_chat_sessions')
    .select('*')
    .eq('youth_id', youthId)
    .eq('session_date', sessionDate)
    .maybeSingle()

  if (error) throw error
  return data
}

export function mapMessagesForUi(rows) {
  return rows
    .filter((row) => row.sender === 'youth' || row.sender === 'ai')
    .map((row) => ({
      role: row.sender === 'youth' ? 'user' : 'ai',
      text: row.message,
    }))
}
