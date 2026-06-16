import { requireInsforge } from '../lib/insforgeClient'
import { getInsights, upsertInsights } from './staffInsightsService'

function db() {
  return requireInsforge().database
}

function mergeStaffEditedMeta(existing = {}, fieldKey) {
  return {
    ...(existing || {}),
    [fieldKey]: new Date().toISOString(),
  }
}

function parseTagInput(text) {
  return String(text || '')
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export { parseTagInput }

export async function saveInsightTextField(youthId, fieldKey, text, staffProfileId) {
  const existing = await getInsights(youthId)
  const staff_edited_fields = mergeStaffEditedMeta(existing?.staff_edited_fields, fieldKey)
  return upsertInsights(
    youthId,
    {
      [fieldKey]: String(text || '').trim(),
      staff_edited_fields,
    },
    staffProfileId,
  )
}

export async function saveInsightTagField(youthId, fieldKey, text, staffProfileId) {
  const existing = await getInsights(youthId)
  const staff_edited_fields = mergeStaffEditedMeta(existing?.staff_edited_fields, fieldKey)
  return upsertInsights(
    youthId,
    {
      [fieldKey]: parseTagInput(text),
      staff_edited_fields,
    },
    staffProfileId,
  )
}

export async function saveDynamicProfileField(youthId, fieldKey, value, staffProfileId, { isSingle = false } = {}) {
  const existing = await getInsights(youthId)
  const dynamic = { ...(existing?.dynamic_profile || {}) }
  dynamic[fieldKey] = isSingle ? String(value || '').trim() : parseTagInput(value)
  const metaKey = `dynamic_profile.${fieldKey}`
  const staff_edited_fields = mergeStaffEditedMeta(existing?.staff_edited_fields, metaKey)
  return upsertInsights(youthId, { dynamic_profile: dynamic, staff_edited_fields }, staffProfileId)
}

async function patchSessionRow(table, sessionId, patch, editedFieldKey) {
  const { data: existing, error: readError } = await db()
    .from(table)
    .select('staff_edited_fields')
    .eq('id', sessionId)
    .maybeSingle()

  if (readError) throw readError
  if (!existing) throw new Error('Session not found')

  const staff_edited_fields = mergeStaffEditedMeta(existing.staff_edited_fields, editedFieldKey)
  const { data, error } = await db()
    .from(table)
    .update({ ...patch, staff_edited_fields })
    .eq('id', sessionId)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('Unable to save — only the assigned youth worker can edit this case.')
  }
  return data
}

export async function saveChatSessionSummary(sessionId, aiSummary, staffProfileId) {
  void staffProfileId
  return patchSessionRow('ai_chat_sessions', sessionId, { ai_summary: String(aiSummary || '').trim() }, 'ai_summary')
}

export async function saveOfflineSessionSummary(sessionId, aiSummary, staffProfileId) {
  void staffProfileId
  return patchSessionRow(
    'offline_counselling_sessions',
    sessionId,
    { ai_summary: String(aiSummary || '').trim() },
    'ai_summary',
  )
}

export async function saveOfflineSessionFollowUp(sessionId, suggestedFollowUp, staffProfileId) {
  void staffProfileId
  return patchSessionRow(
    'offline_counselling_sessions',
    sessionId,
    { suggested_follow_up: String(suggestedFollowUp || '').trim() },
    'suggested_follow_up',
  )
}

export function formatTagsForEdit(items) {
  return (items || []).filter(Boolean).map(String).join('\n')
}
