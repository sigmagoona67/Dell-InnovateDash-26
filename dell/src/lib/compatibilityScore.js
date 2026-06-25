import { resolveStaffProfileAge } from './onboardingRequirements'

/** Youth communication preference ↔ staff support style pairs. */
const SUPPORT_STYLE_PAIRS = [
  ['Listens without interrupting', 'Listens without interrupting'],
  ['Gives emotional support', 'Provides emotional support'],
  ['Gives practical advice', 'Gives practical advice'],
  ['Checks in regularly', 'Checks in regularly'],
  ['Encourages me', 'Encourages youths'],
  ['Challenges me to improve', 'Challenges youths to improve'],
  ['Makes me laugh', 'Makes youths laugh'],
  ['Talks gently', 'Talks gently'],
  ['Is calm under pressure', 'Is calm under pressure'],
  ['Is patient', 'Is patient'],
  ['Gives honest feedback', 'Gives honest feedback'],
  ['Respects my privacy', "Respects youths' privacy"],
  ["Doesn't judge me", "Doesn't judge youths"],
  ['Helps me express my feelings', 'Helps youths express feelings'],
  ['Understands when I need space', 'Understands when youths need space'],
  ['Gives step-by-step guidance', 'Gives step-by-step guidance'],
  ['Is proactive', 'Is proactive'],
  ['Shares personal experiences', 'Shares personal experiences'],
  ['Celebrates my small achievements', "Celebrates youths' small achievements"],
]

/** Challenge labels that count as a match against staff expertise. */
const CHALLENGE_EXPERTISE_ALIASES = {
  anxiety: ['anxiety', 'stress', 'social anxiety'],
  stress: ['stress', 'anxiety'],
  'academic stress': ['academic stress', 'exams', 'school', 'low motivation', 'attendance'],
  exams: ['exams', 'academic stress', 'school'],
  'friendship issues': [
    'friendship issues',
    'social relationships',
    'social anxiety',
    'bullying',
    'relationship issues',
  ],
  bullying: ['bullying', 'friendship issues', 'social relationships'],
  'social anxiety': ['social anxiety', 'friendship issues', 'social relationships', 'anxiety'],
  depression: ['depression', 'mental health', 'anxiety', 'stress'],
  loneliness: ['loneliness', 'social relationships', 'friendship issues'],
  'low self-esteem': ['low self-esteem', 'confidence', 'mental health'],
  anger: ['anger', 'emotional regulation', 'mental health'],
  'family conflict': ['family conflict', 'family', 'parents arguing', 'divorce'],
  'self-harm thoughts': ['self-harm thoughts', 'mental health', 'crisis support'],
  'suicide thoughts': ['suicide thoughts', 'mental health', 'crisis support'],
}

const WEIGHTS = {
  agePreference: 5,
  genderPreference: 5,
  country: 5,
  language: 20,
  supportStyle: 20,
  sharedInterests: 20,
  expertise: 25,
}

const FACTOR_LABELS = {
  agePreference: 'Age Preference',
  genderPreference: 'Gender Preference',
  country: 'Country',
  language: 'Language',
  supportStyle: 'Support Style',
  sharedInterests: 'Shared Interests',
  expertise: 'Expertise',
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function staffAgeInPreferredRange(staffAge, preferredRange) {
  const range = String(preferredRange || '').trim()
  if (!range || range === 'No Preference') return true
  if (staffAge == null) return false
  if (range === '20–30' || range === '20-30') return staffAge >= 20 && staffAge <= 30
  if (range === '30–40' || range === '30-40') return staffAge >= 30 && staffAge <= 40
  if (range === '40+') return staffAge >= 40
  return false
}

function genderMatchesPreference(staffGender, preferredGender) {
  const pref = String(preferredGender || '').trim()
  if (!pref || pref === 'No Preference') return true
  return String(staffGender || '').trim() === pref
}

function sharedItems(a, b) {
  const setB = new Set(asArray(b).map(normalizeKey))
  return asArray(a).filter((item) => setB.has(normalizeKey(item)))
}

function proportionalScore(sharedCount, totalCount, maxPoints) {
  if (!sharedCount || !totalCount) return 0
  const ratio = sharedCount / totalCount
  return Math.round(Math.min(maxPoints, ratio * maxPoints))
}

function countSupportStyleMatches(youthStyles, staffStyles) {
  const youth = asArray(youthStyles)
  const staff = asArray(staffStyles)
  if (!youth.length || !staff.length) return 0

  const staffSet = new Set(staff.map(normalizeKey))
  let matches = 0

  for (const youthStyle of youth) {
    const youthKey = normalizeKey(youthStyle)
    const pair = SUPPORT_STYLE_PAIRS.find(([y]) => normalizeKey(y) === youthKey)
    const equivalents = pair ? [pair[0], pair[1]] : [youthStyle]
    if (equivalents.some((item) => staffSet.has(normalizeKey(item)))) {
      matches += 1
      continue
    }
    if (staff.some((s) => normalizeKey(s).includes(youthKey) || youthKey.includes(normalizeKey(s)))) {
      matches += 1
    }
  }

  return matches
}

function expertiseMatchesChallenge(challenge, expertiseList) {
  const challengeKey = normalizeKey(challenge)
  const aliases = CHALLENGE_EXPERTISE_ALIASES[challengeKey] || [challengeKey]
  const aliasSet = new Set(aliases.map(normalizeKey))

  return asArray(expertiseList).some((expertise) => {
    const expertiseKey = normalizeKey(expertise)
    if (aliasSet.has(expertiseKey)) return true
    return [...aliasSet].some(
      (alias) => expertiseKey.includes(alias) || alias.includes(expertiseKey),
    )
  })
}

function countExpertiseMatches(challenges, expertise) {
  const youthChallenges = asArray(challenges)
  if (!youthChallenges.length) return 0
  return youthChallenges.filter((challenge) => expertiseMatchesChallenge(challenge, expertise)).length
}

function resolveConfidence(score) {
  if (score >= 75) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function buildMatchedFactors(breakdown) {
  const factors = []
  if (breakdown.language > 0) factors.push(FACTOR_LABELS.language)
  if (breakdown.supportStyle > 0) factors.push(FACTOR_LABELS.supportStyle)
  if (breakdown.sharedInterests > 0) factors.push(FACTOR_LABELS.sharedInterests)
  if (breakdown.expertise > 0) factors.push(FACTOR_LABELS.expertise)
  if (!factors.length) {
    if (breakdown.agePreference > 0) factors.push(FACTOR_LABELS.agePreference)
    if (breakdown.genderPreference > 0) factors.push(FACTOR_LABELS.genderPreference)
    if (breakdown.country > 0) factors.push(FACTOR_LABELS.country)
  }
  return factors
}

export function buildRuleBasedMatchExplanation(matchedFactors = []) {
  if (!matchedFactors.length) {
    return 'Limited questionnaire overlap — review the full profile before assigning.'
  }
  const factorText = matchedFactors.join(', ')
  return `Strong alignment in ${factorText.toLowerCase()}. Shared interests may help establish rapport.`
}

export function buildRuleBasedCompatibilityReason({
  matchedFactors = [],
  sharedLanguages = [],
  sharedInterests = [],
  matchedExpertise = [],
} = {}) {
  const parts = []
  if (sharedLanguages.length) {
    parts.push(`Both speak ${sharedLanguages.slice(0, 3).join(' and ')}`)
  }
  if (sharedInterests.length) {
    parts.push(`enjoy ${sharedInterests.slice(0, 2).join(' and ')}`)
  }
  if (matchedFactors.includes(FACTOR_LABELS.supportStyle)) {
    parts.push('prefer compatible support styles')
  }
  if (matchedExpertise.length) {
    parts.push(
      `the staff member specializes in ${matchedExpertise.slice(0, 2).join(' and ')}, making them well suited to support this youth`,
    )
  }

  if (!parts.length) {
    return 'Some questionnaire overlap suggests a workable match. Review the full profile for context.'
  }

  const sentence = parts.join(', ')
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
}

/**
 * Compute rule-based compatibility (0–100) between a youth and staff questionnaire.
 */
export function computeCompatibilityScore(youthQuestionnaire, staffQuestionnaire) {
  const youth = youthQuestionnaire || {}
  const staff = staffQuestionnaire || {}

  const staffAge = resolveStaffProfileAge(staff) ?? staff.age ?? null
  const youthLanguages = asArray(youth.languages)
  const staffLanguages = asArray(staff.languages)
  const youthInterests = asArray(youth.interests)
  const staffInterests = asArray(staff.interests)
  const youthStyles = asArray(youth.preferred_communication_style)
  const staffStyles = asArray(staff.support_style || staff.preferred_communication_style)
  const youthChallenges = asArray(youth.current_challenges)
  const staffExpertise = asArray(staff.areas_of_expertise || staff.supporting_strengths)

  const agePreference = staffAgeInPreferredRange(staffAge, youth.preferred_worker_age_range)
    ? WEIGHTS.agePreference
    : 0
  const genderPreference = genderMatchesPreference(staff.gender, youth.preferred_worker_gender)
    ? WEIGHTS.genderPreference
    : 0
  const country =
    normalizeKey(youth.country) && normalizeKey(youth.country) === normalizeKey(staff.country)
      ? WEIGHTS.country
      : 0

  const sharedLanguageItems = sharedItems(youthLanguages, staffLanguages)
  const language = proportionalScore(
    sharedLanguageItems.length,
    Math.max(youthLanguages.length, staffLanguages.length, 1),
    WEIGHTS.language,
  )

  const styleMatches = countSupportStyleMatches(youthStyles, staffStyles)
  const supportStyle = proportionalScore(styleMatches, Math.max(youthStyles.length, 1), WEIGHTS.supportStyle)

  const sharedInterestItems = sharedItems(youthInterests, staffInterests)
  const sharedInterestsScore = proportionalScore(
    sharedInterestItems.length,
    Math.max(youthInterests.length, staffInterests.length, 1),
    WEIGHTS.sharedInterests,
  )

  const expertiseMatches = countExpertiseMatches(youthChallenges, staffExpertise)
  const expertise = proportionalScore(expertiseMatches, Math.max(youthChallenges.length, 1), WEIGHTS.expertise)

  const matchedExpertise = youthChallenges.filter((challenge) =>
    expertiseMatchesChallenge(challenge, staffExpertise),
  )

  const breakdown = {
    agePreference,
    genderPreference,
    country,
    language,
    supportStyle,
    sharedInterests: sharedInterestsScore,
    expertise,
  }

  const score = Math.min(
    100,
    agePreference +
      genderPreference +
      country +
      language +
      supportStyle +
      sharedInterestsScore +
      expertise,
  )

  const matchedFactors = buildMatchedFactors(breakdown)

  return {
    score,
    confidence: resolveConfidence(score),
    matchedFactors,
    breakdown,
    sharedLanguages: sharedLanguageItems,
    sharedInterests: sharedInterestItems,
    matchedExpertise,
  }
}
