import { hasCareInsightsData, isCareInsightsQuality, normalizeCareInsights } from './careInsights.js'
import { hasDynamicProfileData, normalizeDynamicProfile, profileDynamicFieldsForDisplay } from './dynamicProfile.js'

const GENERIC_DYNAMIC_LABELS = new Set([
  'hobbies',
  'activities',
  'nature',
  'music',
  'coping strategies',
  'self-care',
  'relaxation',
  'stress',
  'anxiety',
  'normal',
  'typical teenager',
  'nice',
])

/** Prefer specific multi-word youth-evidenced labels over generic single-word tags. */
export function dynamicProfileQualityScore(profile) {
  const p = profileDynamicFieldsForDisplay(normalizeDynamicProfile(profile))
  let score = 0

  for (const item of [...p.interests, ...p.personality, ...p.coping_methods]) {
    const tag = String(item || '').trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (GENERIC_DYNAMIC_LABELS.has(key)) {
      score += 0.5
      continue
    }
    score += tag.split(/\s+/).length >= 2 ? 2 : 1
  }

  if (p.living_arrangement?.trim()) score += 2
  return score
}

export function careInsightsQualityScore(insights) {
  const c = normalizeCareInsights(insights)
  if (!isCareInsightsQuality(c)) return 0
  let score = 0
  score += c.current_state.length * 2
  score += c.main_risk.length * 2
  score += c.best_communication_approach.length
  if (c.latest_change?.trim()) score += 3
  return score
}

export function meetsMinimumProfileBundleQuality({ dynamic_profile, ...care } = {}) {
  const dynamicFields = [
    hasDynamicProfileData(dynamic_profile),
    dynamicProfileQualityScore(dynamic_profile) >= 3,
  ].filter(Boolean).length

  const careFields = [
    (care.current_state || []).length > 0,
    (care.main_risk || []).length > 0,
    (care.best_communication_approach || []).length > 0,
    Boolean(String(care.latest_change || '').trim()),
  ].filter(Boolean).length

  return dynamicFields >= 1 && careFields >= 3
}

/** Keep saved profile when a thin regen would downgrade quality. */
export function preserveQualityDynamicProfile(savedProfile, generatedProfile, questionnaire = null) {
  const saved = profileDynamicFieldsForDisplay(normalizeDynamicProfile(savedProfile))
  const generated = profileDynamicFieldsForDisplay(normalizeDynamicProfile(generatedProfile))

  if (!hasDynamicProfileData(generated)) return saved
  if (!hasDynamicProfileData(saved)) return generated

  const savedScore = dynamicProfileQualityScore(saved)
  const generatedScore = dynamicProfileQualityScore(generated)
  if (generatedScore >= Math.max(3, savedScore * 0.75)) return generated
  return saved
}

export function preserveQualityCareInsights(saved, generated) {
  const gen = normalizeCareInsights(generated)
  const prev = normalizeCareInsights(saved)
  if (!isCareInsightsQuality(gen)) return prev
  if (!hasCareInsightsData(prev)) return gen

  const genScore = careInsightsQualityScore(gen)
  const prevScore = careInsightsQualityScore(prev)
  if (genScore >= Math.max(4, prevScore * 0.75)) return gen
  return prev
}
