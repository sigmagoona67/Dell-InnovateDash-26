/** Dashboard card copy — Current Concern + Case Preview (not At a Glance). */

const BANNED_SOURCE_PATTERNS = [
  /\bthe youth discussed\b/i,
  /\bthe latest ai chat\b/i,
  /\bthe latest counselling session\b/i,
  /\baccording to\b/i,
  /\bquestionnaire\b/i,
  /\brecently\b/i,
]

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function capitalizeSentence(text) {
  const value = String(text || '').trim()
  if (!value) return ''
  const body = value.replace(/[.!?]+$/, '')
  return `${body.charAt(0).toUpperCase()}${body.slice(1)}.`
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function isCurrentConcernQuality(text) {
  const value = String(text || '').trim()
  if (!value) return false
  const words = wordCount(value)
  if (words < 4 || words > 20) return false
  if (BANNED_SOURCE_PATTERNS.some((p) => p.test(value))) return false
  return true
}

export function isCasePreviewQuality(text) {
  const value = String(text || '').trim()
  if (!value) return false
  const words = wordCount(value)
  if (words < 20 || words > 80) return false
  if (BANNED_SOURCE_PATTERNS.some((p) => p.test(value))) return false
  return true
}

function concernFromRisk(mainRisk = [], currentState = []) {
  const risks = asArray(mainRisk).map((item) => item.toLowerCase())
  const states = asArray(currentState).map((item) => item.toLowerCase())
  const combined = [...risks, ...states].join(' ')

  const hasHealth = /health|symptom|reassur|anxious/i.test(combined)
  const hasEmotional = /emotional|distress|regulat/i.test(combined)
  if (hasHealth && hasEmotional) return 'Health anxiety and emotional regulation difficulties.'

  const primary = risks[0] || states[0]
  if (!primary) return ''

  if (/isolat|withdraw|alone/i.test(primary)) return 'Increasing social withdrawal and emotional isolation.'
  if (/health|symptom|reassur/i.test(primary)) return 'Health anxiety with frequent reassurance-seeking behaviour.'
  if (/academic|school|exam|study/i.test(primary)) return 'Persistent academic stress affecting daily functioning.'
  if (/family|parent|home/i.test(primary)) return 'Ongoing family conflict affecting emotional wellbeing.'
  if (/sleep/i.test(primary)) return 'Sleep difficulties contributing to daytime exhaustion.'
  if (/overwhelm|stress|strain/i.test(primary)) return 'Emotional overwhelm affecting day-to-day functioning.'
  return capitalizeSentence(`${primary} affecting current wellbeing`)
}

function previewFromSummary(overallSummary, dynamicProfile = {}, concern = '') {
  const summary = String(overallSummary || '').trim()
  if (!summary) return ''

  const parts = []
  const lower = summary.toLowerCase()

  if (/frequent checks? of physical symptoms|checks? (of )?physical symptoms|online searches? for medical/i.test(lower)) {
    parts.push('Frequently worries about physical symptoms and seeks reassurance despite medical advice.')
  } else if (/health[- ]related anxiety|health anxiety/i.test(lower)) {
    parts.push('Health-related anxiety includes frequent symptom checking and reassurance-seeking despite medical advice.')
  } else {
    const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary]
    const behavioral = sentences.find((line) => /symptom|check|search|worr|anxi|reassur|withdraw|isolat|stress|sleep/i.test(line))
    if (behavioral) {
      const cleaned = behavioral
        .replace(/^[A-Za-z0-9]+\s+is\s+/i, '')
        .replace(/\btheir\b/gi, 'their')
        .trim()
      parts.push(capitalizeSentence(cleaned.replace(/^[a-z]/, (c) => c.toUpperCase())))
    }
  }

  const coping = asArray(dynamicProfile.coping_methods).slice(0, 1)[0] || ''
  if (/weather|cloud/i.test(lower) || /weather|cloud/i.test(coping)) {
    parts.push('Weather observation has become a calming routine during periods of anxiety.')
  } else if (coping) {
    parts.push(capitalizeSentence(`${coping} has become a calming routine during difficult periods`))
  }

  let preview = parts.slice(0, 2).join(' ').trim()
  if (!preview && concern) preview = concern

  const words = preview.split(/\s+/).filter(Boolean)
  if (words.length > 65) {
    preview = `${words.slice(0, 65).join(' ').replace(/[,;]$/, '')}.`
  }
  return preview.trim()
}

export function buildCurrentConcernFallback({ insights = {}, questionnaire = null } = {}) {
  const saved = String(insights.current_concern || '').trim()
  if (isCurrentConcernQuality(saved)) return saved

  const fromRisk = concernFromRisk(insights.main_risk, insights.current_state)
  if (fromRisk) return fromRisk

  const qChallenges = asArray(questionnaire?.current_challenges)
  if (qChallenges.length) {
    return capitalizeSentence(`${qChallenges[0]} requiring youth worker attention`)
  }

  return ''
}

export function buildCasePreviewFallback({ insights = {}, sessions = [], youthName = 'This youth' } = {}) {
  const saved = String(insights.case_preview || '').trim()
  if (isCasePreviewQuality(saved)) return saved

  const concern = buildCurrentConcernFallback({ insights })
  const fromSummary = previewFromSummary(
    insights.overall_summary,
    insights.dynamic_profile,
    concern,
  )
  if (isCasePreviewQuality(fromSummary)) return fromSummary

  const latestSession = [...(sessions || [])].sort(
    (a, b) => new Date(b.updated_at || b.session_date) - new Date(a.updated_at || a.session_date),
  )[0]
  const sessionText = String(latestSession?.ai_summary || '').trim()
  const fromSession = previewFromSummary(sessionText, insights.dynamic_profile, concern)
  if (isCasePreviewQuality(fromSession)) return fromSession

  if (concern) {
    return `${concern} Further detail will build as ${youthName} continues to engage with support services.`
  }

  return ''
}

export function resolveCurrentConcern({ insights = {}, questionnaire = null } = {}) {
  const saved = String(insights?.current_concern || '').trim()
  if (isCurrentConcernQuality(saved)) return saved
  return buildCurrentConcernFallback({ insights, questionnaire }) || 'Not enough information yet.'
}

export function resolveCasePreview({ insights = {}, sessions = [], youthName = 'This youth' } = {}) {
  const saved = String(insights?.case_preview || '').trim()
  if (isCasePreviewQuality(saved)) return saved
  return (
    buildCasePreviewFallback({ insights, sessions, youthName }) ||
    'No case preview yet. Preview will appear after the youth engages with AI Companion or sessions are recorded.'
  )
}

export function normalizeCurrentConcern(raw) {
  const value = capitalizeSentence(String(raw || '').trim())
  return isCurrentConcernQuality(value) ? value : ''
}

export function normalizeCasePreview(raw) {
  const value = String(raw || '').trim()
  return isCasePreviewQuality(value) ? value : ''
}

export const DASHBOARD_CARD_BUNDLE_RULES = `7) current_concern — ONE short sentence, 5–15 words. The single most important issue requiring youth worker attention RIGHT NOW. Not a full case summary. No interests/personality lists. No source attribution.

8) case_preview — 2–3 short sentences, approximately 30–60 words. Dashboard card preview before opening full profile. Mention main concern and key behavioural patterns; include meaningful coping behaviours if they help understanding. NOT At a Glance, NOT a session summary, NOT chronological. No source attribution.`
