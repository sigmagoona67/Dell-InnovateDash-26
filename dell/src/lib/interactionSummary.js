export {
  AT_A_GLANCE_PROMPT,
  AT_A_GLANCE_PROMPT_VERSION,
  BANNED_AT_A_GLANCE_PATTERNS,
  buildAtAGlanceFallback,
  buildCombinedOverallSummary,
  collectAtAGlanceContext,
  hasQualityAtAGlance,
  isAtAGlanceQuality,
  preserveQualityAtAGlance,
  regenerateAtAGlance,
  resolveInteractionOverallSummary,
  shouldRewriteOverallSummary,
} from './atAGlance.js'

export function isSelfReportOverallSummary() {
  return false
}

export function buildInteractionOverallSummary(options = {}) {
  return buildCombinedOverallSummary(options) || ''
}
