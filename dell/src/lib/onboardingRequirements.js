import { calculateAgeFromDob, isDobAtLeastMinAge, normalizeIsoDate } from './onboardingData'
import { STAFF_MIN_AGE } from './profileLabels'

/** Bump when onboarding fields or steps change; users below this version must re-complete. */
export const CURRENT_YOUTH_ONBOARDING_VERSION = 2
export const CURRENT_STAFF_ONBOARDING_VERSION = 2

function hasMinItems(value, min = 1) {
  const items = Array.isArray(value) ? value.filter(Boolean) : []
  return items.length >= min
}

function hasBasicInfo(questionnaire) {
  if (!questionnaire) return false
  const hasDob = Boolean(questionnaire.date_of_birth)
  if (!hasDob && questionnaire.age == null) return false
  if (!String(questionnaire.gender || '').trim()) return false
  if (!String(questionnaire.country || '').trim()) return false
  return hasMinItems(questionnaire.languages)
}

export function youthQuestionnaireToOnboardingAnswers(questionnaire) {
  if (!questionnaire) return null

  return {
    basic: {
      dateOfBirth: normalizeIsoDate(questionnaire.date_of_birth),
      gender: questionnaire.gender || '',
      country: questionnaire.country || '',
      languages: questionnaire.languages || [],
      preferredWorkerGender: questionnaire.preferred_worker_gender || '',
      preferredWorkerAgeRange: questionnaire.preferred_worker_age_range || '',
    },
    communication: questionnaire.preferred_communication_style || [],
    interests: questionnaire.interests || [],
    challenges: questionnaire.current_challenges || [],
  }
}

function hasStaffBasicInfo(questionnaire) {
  if (!questionnaire) return false
  const dob = normalizeIsoDate(questionnaire.date_of_birth)
  if (!isDobAtLeastMinAge(dob, STAFF_MIN_AGE)) return false
  if (!String(questionnaire.gender || '').trim()) return false
  if (!String(questionnaire.country || '').trim()) return false
  return hasMinItems(questionnaire.languages)
}

/** Age shown on staff profiles (youth + staff views). Only valid DOB at or above STAFF_MIN_AGE. */
export function resolveStaffProfileAge(questionnaire) {
  if (!questionnaire) return null
  const dob = normalizeIsoDate(questionnaire.date_of_birth)
  if (!isDobAtLeastMinAge(dob, STAFF_MIN_AGE)) return null
  return calculateAgeFromDob(dob)
}

export function staffQuestionnaireToOnboardingAnswers(questionnaire) {
  if (!questionnaire) return null

  let dateOfBirth = normalizeIsoDate(questionnaire.date_of_birth)
  if (!isDobAtLeastMinAge(dateOfBirth, STAFF_MIN_AGE)) {
    dateOfBirth = ''
  }

  return {
    basic: {
      dateOfBirth,
      gender: questionnaire.gender || '',
      country: questionnaire.country || '',
      languages: questionnaire.languages || [],
    },
    communication: questionnaire.support_style || questionnaire.preferred_communication_style || [],
    interests: questionnaire.interests || [],
    challenges: questionnaire.areas_of_expertise || questionnaire.supporting_strengths || [],
  }
}

export function isYouthQuestionnaireCurrent(questionnaire) {
  if (!questionnaire) return false

  const version = questionnaire.questionnaire_version ?? 0
  if (version < CURRENT_YOUTH_ONBOARDING_VERSION) return false

  return (
    hasBasicInfo(questionnaire) &&
    Boolean(String(questionnaire.preferred_worker_gender || '').trim()) &&
    Boolean(String(questionnaire.preferred_worker_age_range || '').trim()) &&
    hasMinItems(questionnaire.preferred_communication_style) &&
    hasMinItems(questionnaire.interests) &&
    hasMinItems(questionnaire.current_challenges)
  )
}

export function isStaffQuestionnaireCurrent(questionnaire) {
  if (!questionnaire) return false

  const version = questionnaire.questionnaire_version ?? 0
  if (version < CURRENT_STAFF_ONBOARDING_VERSION) return false

  const supportStyle = questionnaire.support_style || questionnaire.preferred_communication_style
  const expertise = questionnaire.areas_of_expertise || questionnaire.supporting_strengths

  return (
    hasStaffBasicInfo(questionnaire) &&
    hasMinItems(supportStyle) &&
    hasMinItems(questionnaire.interests) &&
    hasMinItems(expertise)
  )
}

export function isYouthOnboardingComplete(youth, questionnaire) {
  return Boolean(youth?.onboarding_completed) && isYouthQuestionnaireCurrent(questionnaire)
}

export function isStaffOnboardingComplete(staffRecord, questionnaire) {
  return Boolean(staffRecord?.questionnaire_completed) && isStaffQuestionnaireCurrent(questionnaire)
}
