import {
  buildRuleBasedCompatibilityReason,
  buildRuleBasedMatchExplanation,
  computeCompatibilityScore,
} from '../lib/compatibilityScore'
import { normalizeQuestionnaireRow } from './questionnaireService'
import { normalizeStaffQuestionnaireRow } from './staffQuestionnaireService'

function normalizeYouthQuestionnaire(questionnaire) {
  if (!questionnaire) return null
  return normalizeQuestionnaireRow(questionnaire)
}

function normalizeStaffQuestionnaire(questionnaire) {
  if (!questionnaire) return null
  return normalizeStaffQuestionnaireRow(questionnaire)
}

function buildCompatibilityResult(ruleResult) {
  return {
    score: ruleResult.score,
    confidence: ruleResult.confidence,
    matchedFactors: ruleResult.matchedFactors,
    breakdown: ruleResult.breakdown,
    compatibilityReason: buildRuleBasedCompatibilityReason(ruleResult),
    matchExplanation: buildRuleBasedMatchExplanation(ruleResult.matchedFactors),
  }
}

/** Rule-based compatibility between a youth and staff questionnaire. */
export function computeCompatibilityForPair(youthQuestionnaire, staffQuestionnaire) {
  const youth = normalizeYouthQuestionnaire(youthQuestionnaire)
  const staff = normalizeStaffQuestionnaire(staffQuestionnaire)
  const ruleResult = computeCompatibilityScore(youth, staff)
  return buildCompatibilityResult(ruleResult)
}

export function sortByCompatibility(cards = []) {
  return [...cards].sort((a, b) => {
    const scoreA = a.compatibility?.score ?? -1
    const scoreB = b.compatibility?.score ?? -1
    if (scoreB !== scoreA) return scoreB - scoreA
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}
