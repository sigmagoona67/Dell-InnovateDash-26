import { requireInsforge } from '../lib/insforgeClient'
import { calculateAgeFromDob } from '../lib/onboardingData'
import {
  CURRENT_YOUTH_ONBOARDING_VERSION,
  isYouthOnboardingComplete,
} from '../lib/onboardingRequirements'
import { syncProfileInsights } from './aiService'

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

function asString(value) {
  if (value == null) return ''
  return String(value).trim()
}

export function normalizeQuestionnaireRow(row) {
  if (!row) return null

  return {
    ...row,
    interests: asStringArray(row.interests),
    personality: asStringArray(row.personality),
    preferred_communication_style: asStringArray(row.preferred_communication_style),
    living_arrangement: asString(row.living_arrangement),
    current_challenges: asStringArray(row.current_challenges),
    coping_methods: asStringArray(row.coping_methods),
    additional_notes: asString(row.additional_notes),
    languages: asStringArray(row.languages),
    gender: asString(row.gender),
    country: asString(row.country),
    preferred_worker_gender: asString(row.preferred_worker_gender),
    preferred_worker_age_range: asString(row.preferred_worker_age_range),
    age: row.age != null ? Number(row.age) : calculateAgeFromDob(row.date_of_birth),
  }
}

export const EMPTY_QUESTIONNAIRE = {
  interests: [],
  personality: [],
  preferred_communication_style: [],
  living_arrangement: '',
  current_challenges: [],
  coping_methods: [],
  additional_notes: '',
  date_of_birth: null,
  age: null,
  gender: '',
  country: '',
  languages: [],
  preferred_worker_gender: '',
  preferred_worker_age_range: '',
}

function mapAnswersToPayload(answers) {
  const age = calculateAgeFromDob(answers.dateOfBirth)

  return {
    date_of_birth: answers.dateOfBirth || null,
    age,
    gender: answers.gender || null,
    country: answers.country || null,
    languages: answers.languages || [],
    preferred_worker_gender: answers.preferredWorkerGender || null,
    preferred_worker_age_range: answers.preferredWorkerAgeRange || null,
    interests: answers.interests || [],
    preferred_communication_style: answers.communication || [],
    current_challenges: answers.challenges || [],
    questionnaire_version: CURRENT_YOUTH_ONBOARDING_VERSION,
    personality: [],
    living_arrangement: null,
    coping_methods: [],
    additional_notes: '',
  }
}

export async function saveQuestionnaire(youthId, answers) {
  const payload = mapAnswersToPayload(answers)

  const { data: existing, error: existingError } = await db()
    .from('youth_questionnaire')
    .select('id')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (existingError) throw existingError

  let data
  if (existing) {
    const result = await db()
      .from('youth_questionnaire')
      .update(payload)
      .eq('youth_id', youthId)
      .select('*')
      .single()
    if (result.error) throw result.error
    data = result.data
  } else {
    const result = await db()
      .from('youth_questionnaire')
      .insert([{ youth_id: youthId, ...payload }])
      .select('*')
      .single()
    if (result.error) throw result.error
    data = result.data
  }

  try {
    await syncProfileInsights({ summary: 'Questionnaire updated.', riskLevel: 'low' })
  } catch (regenError) {
    console.warn('[questionnaire] At a Glance regen after save failed:', regenError?.message || regenError)
  }

  return data
}

export async function completeOnboarding(youthId, answers, { preferredName } = {}) {
  await saveQuestionnaire(youthId, answers)

  const { data: existing, error: existingError } = await db()
    .from('youth_profiles')
    .select('assigned_staff_id')
    .eq('id', youthId)
    .maybeSingle()

  if (existingError) throw existingError

  const updatePayload = {
    onboarding_completed: true,
  }

  if (!existing?.assigned_staff_id) {
    updatePayload.assignment_status = 'pending'
    updatePayload.assigned_staff_id = null
  }

  if (preferredName?.trim()) {
    updatePayload.preferred_name = preferredName.trim()
  }

  const { data, error } = await db()
    .from('youth_profiles')
    .update(updatePayload)
    .eq('id', youthId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function reconcileYouthOnboardingStatus(youth, questionnaire) {
  const onboardingComplete = isYouthOnboardingComplete(youth, questionnaire)
  const flaggedComplete = Boolean(youth?.onboarding_completed)

  if (flaggedComplete === onboardingComplete) {
    return { youth, onboardingComplete }
  }

  const { data, error } = await db()
    .from('youth_profiles')
    .update({ onboarding_completed: onboardingComplete })
    .eq('id', youth.id)
    .select('*')
    .single()

  if (error) throw error
  return { youth: data, onboardingComplete }
}

export async function getQuestionnaire(youthId) {
  const { data, error } = await db()
    .from('youth_questionnaire')
    .select('*')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (error) throw error
  return normalizeQuestionnaireRow(data)
}
