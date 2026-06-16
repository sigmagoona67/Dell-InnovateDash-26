import { profileDynamicFieldsForDisplay, normalizeDynamicProfile } from './dynamicProfile.js'
import { normalizeCareInsights } from './careInsights.js'

export { AT_A_GLANCE_PROMPT, AT_A_GLANCE_PROMPT_VERSION } from './atAGlancePrompt.js'

const MOOD_CHECKIN_LINE = /^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i

export const BANNED_AT_A_GLANCE_PATTERNS = [
  /\bthe latest session\b/i,
  /\bthe latest ai chat\b/i,
  /\bthe latest counselling session\b/i,
  /\brecent records show\b/i,
  /\brecent records indicate\b/i,
  /\bthe youth discussed\b/i,
  /\bthe youth shared\b/i,
  /\bthe youth reported\b/i,
  /\bmood check indicates\b/i,
  /\bcontinued monitoring is recommended\b/i,
  /\boffline session\b/i,
  /\bai chat\b/i,
  /\bafter-hours\b/i,
  /\bquestionnaire\b/i,
  /\baccording to the questionnaire\b/i,
  /\bon file\b/i,
  /\bmost recent contact\b/i,
  /\brecently\b/i,
  /\baccording to\b/i,
]

/** Rule-based template from buildAtAGlanceFallback — not locked AI quality. */
export const AT_A_GLANCE_RULE_FALLBACK_PATTERNS = [
  /\bpresents as a young person\b/i,
  /\bAcross contacts,\b/i,
  /\bThey tend to restore calm through\b/i,
  /\bprivate low-stimulation rituals remain important anchors\b/i,
  /\bThis factual overview is based on limited contact\b/i,
  /\bnavigating ongoing emotional strain alongside everyday pressures\b/i,
  /\bcarrying a subdued and emotionally weighted presentation\b/i,
  /\bHome context \(/i,
  /\bFamily dynamics appear to weigh on mood\b/i,
  /\bSadness or overwhelm has been the factor most visibly affecting\b/i,
  /\bappears to exert the greatest influence on how manageable life feels\b/i,
]

export function isAtAGlanceRuleFallback(text) {
  const value = String(text || '').trim()
  if (!value) return false
  return AT_A_GLANCE_RULE_FALLBACK_PATTERNS.some((p) => p.test(value))
}

/** Locked AI portrait — passes quality gates and is not the rule template. */
export function hasLockedAtAGlanceQuality(text) {
  return isAtAGlanceQuality(text) && !isAtAGlanceRuleFallback(text)
}

/** Prefer locked AI output; never keep rule template over fresh AI. */
export function preserveQualityAtAGlance(saved, generated) {
  const savedText = String(saved || '').trim()
  const genText = String(generated || '').trim()
  if (hasLockedAtAGlanceQuality(genText)) return genText
  if (hasLockedAtAGlanceQuality(savedText)) return savedText
  if (isAtAGlanceQuality(genText)) return genText
  if (isAtAGlanceQuality(savedText)) return savedText
  return genText || savedText
}

export function hasQualityAtAGlance(text) {
  return hasLockedAtAGlanceQuality(text)
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function joinNatural(items, limit = 4) {
  const list = (items || []).filter(Boolean).map(String)
  if (!list.length) return ''
  const slice = list.slice(0, limit)
  if (slice.length === 1) return slice[0]
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`
  return `${slice.slice(0, -1).join(', ')}, and ${slice[slice.length - 1]}`
}

function youthChatLines(messages = []) {
  return (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter((line) => line && !MOOD_CHECKIN_LINE.test(line))
}

function youthTranscriptLines(transcript = '') {
  const lines = []
  for (const raw of String(transcript || '').split(/\n/)) {
    const line = raw.trim()
    if (!line) continue
    const tagged = line.match(/^(?:Youth|YOUTH|Client|Student)\s*[:\-]\s*(.+)$/i)
    if (tagged) lines.push(tagged[1].trim())
  }
  return lines
}

function approvedOffline(offlineSessions = []) {
  return [...(offlineSessions || [])].filter((s) => s.status !== 'draft')
}

function moodHistory(aiSessions = []) {
  return (aiSessions || [])
    .map((s) => s.mood_check_in)
    .filter(Boolean)
    .map(String)
}

function questionnaireBackgroundFrom(questionnaire) {
  if (!questionnaire) return null
  return {
    interests: questionnaire.interests || [],
    personality: questionnaire.personality || [],
    preferred_communication_style: questionnaire.preferred_communication_style || [],
    living_arrangement: questionnaire.living_arrangement || '',
    current_challenges: questionnaire.current_challenges || [],
    coping_methods: questionnaire.coping_methods || [],
    additional_notes: questionnaire.additional_notes || '',
  }
}

/** Gather all inputs for At a Glance generation. */
export function collectAtAGlanceContext({
  youthName = 'This youth',
  questionnaire = null,
  dynamicProfile = null,
  careInsights = null,
  existingOverallSummary = '',
  messages = [],
  aiSessions = [],
  offlineSessions = [],
} = {}) {
  const dynamic = profileDynamicFieldsForDisplay(normalizeDynamicProfile(dynamicProfile))
  const questionnaireBackground = questionnaireBackgroundFrom(questionnaire)
  const youthSpeech = youthChatLines(messages).join('\n')
  const offline = approvedOffline(offlineSessions)
  const sessionSummaries = [
    ...(aiSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...offline.map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]
  const offlineTranscriptSample = offline
    .map((s) => youthTranscriptLines(s.transcript).join('\n'))
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)

  const primaryCorpus = [youthSpeech, ...sessionSummaries, offlineTranscriptSample].filter(Boolean).join('\n')
  const care = normalizeCareInsights(careInsights || {})

  return {
    youthName: youthName || 'This youth',
    dynamicProfile: dynamic,
    questionnaireBackground,
    careInsights: {
      current_state: care.current_state,
      main_risk: care.main_risk,
      best_communication_approach: care.best_communication_approach,
      latest_change: care.latest_change,
    },
    existingOverallSummary: String(existingOverallSummary || '').trim(),
    moodHistory: moodHistory(aiSessions),
    recentMood: (aiSessions || []).find((s) => s.mood_check_in)?.mood_check_in || null,
    youthSpeech,
    sessionSummaries,
    offlineTranscriptSample,
    primaryCorpus,
    corpus: primaryCorpus,
  }
}

/** JSON payload sent to the AI for At a Glance generation. */
export function buildAtAGlanceAiPayload(context) {
  const ctx = context?.primaryCorpus ? context : collectAtAGlanceContext(context || {})
  return {
    youthName: ctx.youthName,
    youthSpeechSample: ctx.youthSpeech.slice(0, 5000),
    sessionSummaries: ctx.sessionSummaries.slice(0, 8),
    offlineTranscriptSample: ctx.offlineTranscriptSample,
    moodHistory: ctx.moodHistory,
    recentMood: ctx.recentMood,
    dynamicProfile: ctx.dynamicProfile,
    careInsights: ctx.careInsights,
    existingOverallSummary: ctx.existingOverallSummary,
    questionnaireBackground: ctx.questionnaireBackground,
  }
}

export function isAtAGlanceQuality(text) {
  const value = String(text || '').trim()
  if (!value) return false
  if (/[\u4e00-\u9fff]/.test(value)) return false
  const words = wordCount(value)
  if (words < 40) return false
  if (words > 280) return false
  if (BANNED_AT_A_GLANCE_PATTERNS.some((p) => p.test(value))) return false
  return true
}

function clampAtAGlanceWords(text, max = 220) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= max) return words.join(' ')
  return `${words.slice(0, max).join(' ').replace(/[,;]$/, '')}.`
}

function detectPortraitThemes(corpus) {
  const themes = []
  if (/exam|academic|study|grade|school|homework/i.test(corpus)) themes.push('academic pressure')
  if (/sleep|insomnia|can't sleep|睡不着|失眠/i.test(corpus)) themes.push('sleep disruption')
  if (/family|parent|home|mom|dad|吵架|argu/i.test(corpus)) themes.push('family tension')
  if (/lonely|alone|isolated|withdraw|solitude|headphone/i.test(corpus)) themes.push('social withdrawal')
  if (/bird|leaf|headphone|aquarium|nature|counting|collect/i.test(corpus)) {
    themes.push('quiet sensory self-regulation')
  }
  if (/guitar|piano|music|draw|art|game|minecraft/i.test(corpus)) themes.push('creative or immersive coping')
  if (/bully|peer|classmate/i.test(corpus)) themes.push('peer difficulties')
  if (/stress|overwhelm|anxious|worry|sad|low mood/i.test(corpus)) themes.push('emotional strain')
  return themes
}

/** Rule-based portrait — corpus-first; questionnaire only when interactions are thin. */
export function buildAtAGlanceFallback(context) {
  const ctx = context?.primaryCorpus != null ? context : collectAtAGlanceContext(context || {})
  const name = ctx.youthName || 'This youth'
  const { dynamicProfile, questionnaireBackground, primaryCorpus, moodHistory: moods, recentMood } = ctx

  const hasPrimary = Boolean(primaryCorpus.trim())
  const q = questionnaireBackground || {}
  const themes = detectPortraitThemes(primaryCorpus)

  if (!hasPrimary && !q.interests?.length && !q.current_challenges?.length && !dynamicProfile.interests?.length) {
    return ''
  }

  const sentences = []

  if (hasPrimary) {
    let opening = `${name} presents as a young person`
    if (dynamicProfile.personality?.length) {
      opening += ` who often appears ${joinNatural(dynamicProfile.personality, 2).toLowerCase()}`
    } else if (recentMood && /sad|stressed|overwhelmed/i.test(String(recentMood))) {
      opening += ' carrying a subdued and emotionally weighted presentation'
    } else {
      opening += ' navigating ongoing emotional strain alongside everyday pressures'
    }
    opening += '.'
    sentences.push(opening)

    if (themes.length) {
      sentences.push(
        `Across contacts, ${joinNatural(themes, 3).toLowerCase()} have shaped how they manage mood, concentration and daily routines, with similar patterns recurring rather than appearing as isolated incidents.`,
      )
    }

    const restorative = joinNatural(
      [...(dynamicProfile.coping_methods || []), ...(dynamicProfile.interests || [])],
      3,
    )
    if (restorative) {
      sentences.push(
        `They tend to restore calm through ${restorative.toLowerCase()}, suggesting private low-stimulation rituals remain important anchors when distress rises.`,
      )
    }

    if (dynamicProfile.living_arrangement) {
      sentences.push(
        `Home context (${dynamicProfile.living_arrangement.toLowerCase()}) forms part of the backdrop to their current stress.`,
      )
    } else if (/family|parent|home/i.test(primaryCorpus)) {
      sentences.push('Family dynamics appear to weigh on mood alongside school and social expectations.')
    }

    if (moods.length) {
      const lowMoods = moods.filter((m) => /sad|stressed|overwhelmed/i.test(String(m)))
      if (lowMoods.length >= Math.ceil(moods.length / 2)) {
        sentences.push(
          'Sadness or overwhelm has been the factor most visibly affecting day-to-day wellbeing recently.',
        )
      }
    } else if (themes[0]) {
      sentences.push(`At present, ${themes[0]} appears to exert the greatest influence on how manageable life feels.`)
    }
  } else if (q.interests?.length || q.personality?.length || q.current_challenges?.length) {
    const parts = []
    if (q.interests?.length) parts.push(`enjoys ${joinNatural(q.interests, 2).toLowerCase()}`)
    if (q.personality?.length) parts.push(`tends to be ${joinNatural(q.personality, 2).toLowerCase()}`)
    if (q.living_arrangement) parts.push(`lives ${q.living_arrangement.toLowerCase()}`)
    if (q.current_challenges?.length) parts.push(`is currently experiencing ${joinNatural(q.current_challenges, 2).toLowerCase()}`)
    sentences.push(
      `${name} ${parts.join(', ')}. This factual overview is based on limited contact so far; a fuller portrait will develop as interactions accumulate.`,
    )
  }

  return clampAtAGlanceWords(sentences.join(' '))
}

/** Fresh portrait — AI output when quality passes, else corpus-first fallback. */
export function regenerateAtAGlance({ aiGenerated = '', context } = {}) {
  const ai = String(aiGenerated || '').trim()
  if (hasLockedAtAGlanceQuality(ai)) return clampAtAGlanceWords(ai)
  return buildAtAGlanceFallback(context)
}

export function buildCombinedOverallSummary(options = {}) {
  const context = collectAtAGlanceContext(options)
  return regenerateAtAGlance({ context }) || null
}

export function resolveInteractionOverallSummary({ saved = '', ...options } = {}) {
  const savedText = String(saved || '').trim()
  if (savedText && hasLockedAtAGlanceQuality(savedText)) return savedText
  const context = collectAtAGlanceContext(options)
  return regenerateAtAGlance({ context }) || buildAtAGlanceFallback(context) || ''
}

export function shouldRewriteOverallSummary(text) {
  return !hasLockedAtAGlanceQuality(text)
}
