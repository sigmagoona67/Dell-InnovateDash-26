import { emptyOfflineSummaryPackage } from './aiContentStubs.js'
import { mergeDynamicProfileForPersist, profileDynamicFieldsForDisplay } from './dynamicProfile'
import { regenerateCareInsights } from './careInsights'
import { normalizeSessionNote } from './sessionCaseNote'

export function mergeOfflineDisplaySummary(aiSummary, portfolioNote) {
  const session = String(aiSummary || '').trim()
  const portfolio = String(portfolioNote || '').trim()
  return session || portfolio
}

export function finalizeOfflineSessionSummary(summary = {}) {
  return {
    ...summary,
    ai_summary: normalizeSessionNote(summary.ai_summary),
    latest_change: String(summary.latest_change || '').trim(),
  }
}

export function synthesizeOfflineSummary() {
  return finalizeOfflineSessionSummary(emptyOfflineSummaryPackage())
}

export function isWeakAiSummary(summary) {
  return !String(summary || '').trim()
}

export function enrichOfflineSummary(aiResult, _transcript = '', { questionnaire = null } = {}) {
  if (!aiResult) return finalizeOfflineSessionSummary(emptyOfflineSummaryPackage())
  return finalizeOfflineSessionSummary({
    ...emptyOfflineSummaryPackage(),
    ...aiResult,
    ai_summary: normalizeSessionNote(aiResult.ai_summary),
    dynamic_profile: profileDynamicFieldsForDisplay(
      mergeDynamicProfileForPersist({
        generatedProfile: aiResult.dynamic_profile,
        questionnaire,
      }),
    ),
    ...regenerateCareInsights({
      aiGenerated: aiResult,
      saved: null,
    }),
  })
}

export function resolveOfflineSessionSummary(session) {
  return normalizeSessionNote(session?.ai_summary || '')
}
