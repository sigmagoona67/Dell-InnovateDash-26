import { requireInsforge } from '../lib/insforgeClient'

function db() {
  return requireInsforge().database
}

function isMissingDynamicProfileColumn(error) {
  const message = String(error?.message || '')
  return /dynamic_profile/i.test(message) && /schema cache|column/i.test(message)
}

function buildInsightsRow(youthId, payload, staffProfileId, { includeDynamicProfile = true } = {}) {
  const row = {
    ...payload,
    updated_by: staffProfileId,
    approved_at: new Date().toISOString(),
  }

  if (!includeDynamicProfile && row.dynamic_profile !== undefined) {
    const { dynamic_profile: _ignored, ...rest } = row
    return youthId ? { youth_id: youthId, ...rest } : rest
  }

  return youthId ? { youth_id: youthId, ...row } : row
}

async function writeInsights(youthId, row, existing) {
  if (existing) {
    const { youth_id: _youthId, ...updateRow } = row
    const { data, error } = await db()
      .from('ai_dynamic_insights')
      .update(updateRow)
      .eq('youth_id', youthId)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await db().from('ai_dynamic_insights').insert([row]).select('*').single()

  if (error) throw error
  return data
}

export async function getInsights(youthId) {
  const { data, error } = await db()
    .from('ai_dynamic_insights')
    .select('*')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertInsights(youthId, payload, staffProfileId) {
  const { data: existing, error: existingError } = await db()
    .from('ai_dynamic_insights')
    .select('*')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (existingError) throw existingError

  const row = buildInsightsRow(youthId, payload, staffProfileId)

  try {
    return await writeInsights(youthId, row, existing)
  } catch (error) {
    if (!isMissingDynamicProfileColumn(error)) throw error

    const fallbackRow = buildInsightsRow(youthId, payload, staffProfileId, {
      includeDynamicProfile: false,
    })
    return await writeInsights(youthId, fallbackRow, existing)
  }
}
