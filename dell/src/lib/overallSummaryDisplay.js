const LEGACY_PATTERNS = [
  /^Combined insight for staff on [^:]+:\s*/i,
  /Through after-hours AI companion contact,?\s*:?\s*/gi,
  /From staff–youth counselling contact,?\s*/gi,
  /From staff-youth counselling contact,?\s*/gi,
  /Current presentation:\s*[\s\S]*?(?=Cumulative concerns:|Elevated risk|Sustained strain|Continue warm|$)/i,
  /Cumulative concerns:\s*[\s\S]*?(?=Elevated risk|Sustained strain|Continue warm|$)/i,
  /Elevated risk —[\s\S]*$/i,
  /Sustained strain across contact channels[\s\S]*$/i,
  /Continue warm continuity[\s\S]*$/i,
  /This overview combines offline counselling.*$/is,
  /This overview reflects how staff have experienced.*$/is,
  /\beven so, they remain\b.*$/i,
  /who often turns to .+ to relieve stress/i,
]

/** Display-only cleanup for legacy stored summaries. */
export function formatAtAGlanceDisplay(text) {
  let value = String(text || '').trim()
  if (!value) return ''

  for (const pattern of LEGACY_PATTERNS) {
    value = value.replace(pattern, '').trim()
  }

  return value.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim()
}
