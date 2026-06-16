import { requireInsforge } from '../lib/insforgeClient'

function db() {
  return requireInsforge().database
}

export async function findSessionForDate(youthId, sessionDate) {
  const { data, error } = await db()
    .from('offline_counselling_sessions')
    .select('*')
    .eq('youth_id', youthId)
    .eq('session_date', sessionDate)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createDraftSession({ youthId, staffId, transcript, sessionDate }) {
  const { data, error } = await db()
    .from('offline_counselling_sessions')
    .insert([
      {
        youth_id: youthId,
        staff_id: staffId,
        transcript,
        session_date: sessionDate || new Date().toISOString().slice(0, 10),
        status: 'draft',
      },
    ])
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateDraftSession(sessionId, payload) {
  const { data, error } = await db()
    .from('offline_counselling_sessions')
    .update(payload)
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function approveSession(sessionId) {
  const { data, error } = await db()
    .from('offline_counselling_sessions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteDraftSession(sessionId) {
  const { error } = await db()
    .from('offline_counselling_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('status', 'draft')

  if (error) throw error
}

export async function getApprovedSessions(youthId) {
  const { data, error } = await db()
    .from('offline_counselling_sessions')
    .select('*')
    .eq('youth_id', youthId)
    .eq('status', 'approved')
    .order('session_date', { ascending: false })

  if (error) throw error
  return data || []
}
