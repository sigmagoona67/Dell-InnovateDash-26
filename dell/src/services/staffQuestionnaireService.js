import { STAFF_MIN_AGE } from '../lib/profileLabels'
import { requireInsforge } from '../lib/insforgeClient'
import { calculateAgeFromDob, normalizeIsoDate } from '../lib/onboardingData'
import {
  CURRENT_STAFF_ONBOARDING_VERSION,
  isStaffOnboardingComplete,
  resolveStaffProfileAge,
} from '../lib/onboardingRequirements'

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

export function normalizeStaffQuestionnaireRow(row) {
  if (!row) return null

  return {
    ...row,
    languages: asStringArray(row.languages),
    interests: asStringArray(row.interests),
    support_style: asStringArray(row.support_style || row.preferred_communication_style),
    areas_of_expertise: asStringArray(row.areas_of_expertise || row.supporting_strengths),
    gender: asString(row.gender),
    country: asString(row.country),
    date_of_birth: normalizeIsoDate(row.date_of_birth) || null,
    age: resolveStaffProfileAge(row),
  }
}

export const EMPTY_STAFF_QUESTIONNAIRE = {
  date_of_birth: null,
  age: null,
  gender: '',
  country: '',
  languages: [],
  interests: [],
  support_style: [],
  areas_of_expertise: [],
}

function mapStaffAnswersToPayload(answers) {
  const dob = normalizeIsoDate(answers.dateOfBirth)
  const age = calculateAgeFromDob(dob)

  return {
    date_of_birth: dob || null,
    age: age != null && age >= STAFF_MIN_AGE ? age : null,
    gender: answers.gender || null,
    country: answers.country || null,
    languages: answers.languages || [],
    interests: answers.interests || [],
    preferred_communication_style: answers.communication || [],
    supporting_strengths: answers.challenges || [],
    questionnaire_version: CURRENT_STAFF_ONBOARDING_VERSION,
    personality: [],
    quiz_completed: true,
  }
}

/** staffProfileId is profiles.id (matches staff_questionnaire.staff_id FK). */
export async function saveStaffQuestionnaire(staffProfileId, answers) {
  const payload = mapStaffAnswersToPayload(answers)

  const { data: existing, error: existingError } = await db()
    .from('staff_questionnaire')
    .select('id')
    .eq('staff_id', staffProfileId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const result = await db()
      .from('staff_questionnaire')
      .update(payload)
      .eq('staff_id', staffProfileId)
      .select('*')
      .single()
    if (result.error) throw result.error
    return result.data
  }

  const result = await db()
    .from('staff_questionnaire')
    .insert([{ staff_id: staffProfileId, ...payload }])
    .select('*')
    .single()
  if (result.error) throw result.error
  return result.data
}

export async function completeStaffOnboarding(staffProfileId, answers) {
  await saveStaffQuestionnaire(staffProfileId, answers)

  const { data, error } = await db()
    .from('staff_profiles')
    .update({ questionnaire_completed: true })
    .eq('profile_id', staffProfileId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getStaffQuestionnaire(staffProfileId) {
  const { data, error } = await db()
    .from('staff_questionnaire')
    .select('*')
    .eq('staff_id', staffProfileId)
    .maybeSingle()

  if (error) throw error
  return normalizeStaffQuestionnaireRow(data)
}

export async function getStaffQuestionnaireByProfileId(profileId) {
  return getStaffQuestionnaire(profileId)
}

export async function reconcileStaffOnboardingStatus(staffRecord, questionnaire) {
  const onboardingComplete = isStaffOnboardingComplete(staffRecord, questionnaire)
  const flaggedComplete = Boolean(staffRecord?.questionnaire_completed)

  if (flaggedComplete === onboardingComplete) {
    return { staffRecord, onboardingComplete }
  }

  const { data, error } = await db()
    .from('staff_profiles')
    .update({ questionnaire_completed: onboardingComplete })
    .eq('profile_id', staffRecord.profile_id)
    .select('*')
    .single()

  if (error) throw error
  return { staffRecord: data, onboardingComplete }
}

export function summarizeInterests(interests = []) {
  const items = asStringArray(interests)
  if (!items.length) return ''
  return items.slice(0, 5).join(', ')
}
