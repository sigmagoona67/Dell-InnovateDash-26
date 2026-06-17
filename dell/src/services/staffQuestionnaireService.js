import { requireInsforge } from '../lib/insforgeClient'

function db() {
  return requireInsforge().database
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
    } catch {
      return [trimmed]
    }
  }
  return []
}

function formatPersonalityScale(item) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return String(item ?? '')

  const left = item.left || item.leftLabel
  const right = item.right || item.rightLabel
  const value = Number(item.value)
  if (!left || !right || Number.isNaN(value)) return JSON.stringify(item)

  let lean = 'Balanced'
  if (value <= 3) lean = `Leans ${left}`
  else if (value >= 7) lean = `Leans ${right}`

  return `${left} ↔ ${right}: ${lean} (${value}/10)`
}

function asPersonalityArray(value) {
  if (!Array.isArray(value)) return asStringArray(value)
  return value.filter(Boolean).map(formatPersonalityScale).filter(Boolean)
}

function asString(value) {
  if (value == null) return ''
  return String(value).trim()
}

export function normalizeStaffQuestionnaireRow(row) {
  if (!row) return null

  return {
    ...row,
    interests: asStringArray(row.interests),
    personality: Array.isArray(row.personality) ? row.personality : [],
    preferred_communication_style: asStringArray(row.preferred_communication_style),
    supporting_strengths: asStringArray(row.supporting_strengths),
    additional_notes: asString(row.additional_notes),
    quiz_completed: Boolean(row.quiz_completed),
  }
}

export const EMPTY_STAFF_QUESTIONNAIRE = {
  interests: [],
  personality: [],
  preferred_communication_style: [],
  supporting_strengths: [],
  additional_notes: '',
  quiz_completed: false,
}

function mapAnswersToPayload(answers, { quizCompleted = true } = {}) {
  return {
    interests: answers.interests || [],
    personality: Array.isArray(answers.personality) ? answers.personality : [],
    preferred_communication_style: answers.communication || [],
    supporting_strengths: answers.strengths || [],
    additional_notes: answers.notes || '',
    quiz_completed: quizCompleted,
  }
}

export async function getStaffQuestionnaire(staffId) {
  const { data, error } = await db()
    .from('staff_questionnaire')
    .select('*')
    .eq('staff_id', staffId)
    .maybeSingle()

  if (error) throw error
  return normalizeStaffQuestionnaireRow(data)
}

export async function saveStaffQuestionnaire(staffId, answers, options = {}) {
  const payload = mapAnswersToPayload(answers, options)

  const { data: existing, error: existingError } = await db()
    .from('staff_questionnaire')
    .select('id')
    .eq('staff_id', staffId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const { data, error } = await db()
      .from('staff_questionnaire')
      .update(payload)
      .eq('staff_id', staffId)
      .select('*')
      .single()
    if (error) throw error
    return normalizeStaffQuestionnaireRow(data)
  }

  const { data, error } = await db()
    .from('staff_questionnaire')
    .insert([{ staff_id: staffId, ...payload }])
    .select('*')
    .single()

  if (error) throw error
  return normalizeStaffQuestionnaireRow(data)
}

export function summarizePersonality(personality = []) {
  const items = asPersonalityArray(personality)
  if (!items.length) return 'Personality profile not provided yet.'
  if (items.length <= 2) return items.join(' · ')
  return `${items.slice(0, 2).join(' · ')} · +${items.length - 2} more traits`
}

export function summarizeInterests(interests = []) {
  const items = asStringArray(interests)
  if (!items.length) return ''
  return items.slice(0, 5).join(', ')
}
