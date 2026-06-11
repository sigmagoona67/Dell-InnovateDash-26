import { requireInsforge } from '../lib/insforgeClient'

function db() {
  return requireInsforge().database
}

export async function upsertInsights(youthId, payload, staffProfileId) {
  const { data: existing, error: existingError } = await db()
    .from('ai_dynamic_insights')
    .select('id')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (existingError) throw existingError

  const row = {
    ...payload,
    updated_by: staffProfileId,
    approved_at: new Date().toISOString(),
  }

  if (existing) {
    const { data, error } = await db()
      .from('ai_dynamic_insights')
      .update(row)
      .eq('youth_id', youthId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await db()
    .from('ai_dynamic_insights')
    .insert([{ youth_id: youthId, ...row }])
    .select('*')
    .single()

  if (error) throw error
  return data
}
