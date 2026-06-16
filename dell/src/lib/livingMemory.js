import { emptyInsightsFallback } from './aiContentStubs.js'
import { regenerateAtAGlance, collectAtAGlanceContext, hasLockedAtAGlanceQuality } from './atAGlance.js'
import { regenerateCareInsights } from './careInsights.js'
import { mergeDynamicProfileForPersist } from './dynamicProfile.js'

function pickText(next, previous = '', fallback = '') {
  const trimmed = String(next || '').trim()
  if (trimmed) return trimmed
  if (String(previous || '').trim()) return String(previous).trim()
  return fallback
}

export const BANNED_SUMMARY_PATTERNS = []

export function isCaseSnapshotQuality(text) {
  return Boolean(String(text || '').trim())
}

export function clampSnapshotWords(text) {
  return String(text || '').trim()
}

export function mergeCaseSnapshotIncremental(previous = '', generated = '') {
  return pickText(generated, previous)
}

export function buildCaseSnapshot() {
  return ''
}

export function buildLivingCaseStory() {
  return ''
}

export function mergeOverallSummaryMemory({ generated = '', built = '' } = {}) {
  return pickText(generated, built, '')
}

export function buildConcreteCurrentState() {
  return []
}

export function buildConcreteMainRisk({ previous = [] } = {}) {
  return Array.isArray(previous) ? previous : []
}

export function buildConcreteCommunicationApproach({ previous = [] } = {}) {
  return Array.isArray(previous) ? previous : []
}

export function buildMoodLatestChange() {
  return ''
}

export function buildLatestInteractionChange() {
  return ''
}

export function resolveLatestInteractionChange({ saved = '' } = {}) {
  return String(saved || '').trim()
}

export function mergeLivingInsights({ previous = {}, generated = {}, fallback = {}, context = {} } = {}) {
  const prev = previous || {}
  const gen = generated || {}
  const base = fallback || emptyInsightsFallback()

  const dynamic_profile = mergeDynamicProfileForPersist({
    savedProfile: prev.dynamic_profile,
    generatedProfile: gen.dynamic_profile || context.dynamicProfile || base.dynamic_profile,
    questionnaire: context.questionnaire,
  })

  const atAGlanceContext = collectAtAGlanceContext({
    youthName: context.youthName,
    questionnaire: context.questionnaire,
    dynamicProfile: context.dynamicProfile || dynamic_profile,
    careInsights: prev,
    existingOverallSummary: prev.overall_summary,
    messages: context.messages,
    aiSessions: context.aiSessions,
    offlineSessions: context.offlineSessions,
  })

  const savedSummary = String(prev.overall_summary || '').trim()
  const overall_summary =
    savedSummary && hasLockedAtAGlanceQuality(savedSummary)
      ? savedSummary
      : regenerateAtAGlance({
          aiGenerated: gen.overall_summary,
          context: atAGlanceContext,
        })

  const careInsights = regenerateCareInsights({
    aiGenerated: {
      current_state: gen.current_state,
      main_risk: gen.main_risk,
      best_communication_approach: gen.best_communication_approach,
      latest_change: gen.latest_change,
    },
    saved: prev,
  })

  return {
    current_state: careInsights.current_state,
    risk_level: pickText(gen.risk_level, base.risk_level, prev.risk_level || 'low'),
    main_risk: careInsights.main_risk,
    best_communication_approach: careInsights.best_communication_approach,
    latest_change: careInsights.latest_change,
    overall_summary,
    morning_brief: gen.morning_brief || base.morning_brief || prev.morning_brief || emptyInsightsFallback().morning_brief,
    dynamic_profile,
  }
}
