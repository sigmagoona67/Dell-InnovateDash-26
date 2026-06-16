import { EMPTY_DYNAMIC_PROFILE } from './aiContentStubs.js'
import { DYNAMIC_PROFILE_QUALITY_EXAMPLES } from './profileBundlePrompts.js'
import { preserveQualityDynamicProfile } from './profileQuality.js'

export { EMPTY_DYNAMIC_PROFILE }

/** Questionnaire-only on Youth Profile grid — never AI-filled on static side. */
export const STATIC_ONLY_PROFILE_FIELDS = ['preferred_communication_style', 'current_challenges']

/** Fields AI may populate in Dynamic Profile (open vocabulary). */
export const DYNAMIC_PROFILE_FIELDS = ['interests', 'personality', 'living_arrangement', 'coping_methods']

export const DYNAMIC_PROFILE_PROMPT = `Generate dynamic_profile as the AI's current understanding of this youth.

${DYNAMIC_PROFILE_QUALITY_EXAMPLES}

STATIC vs DYNAMIC (critical):
- Static Profile comes ONLY from the youth questionnaire (how they describe themselves). You will receive it as staticProfile for context only.
- NEVER copy questionnaire labels into dynamic_profile unless you add NEW meaningful context beyond static wording.
- Example: static "Music" + youth says they listen to piano nightly for calm → dynamic interests: "Piano music", "Listening to music for emotional regulation" — NOT another "Music".
- Dynamic and Static are independent. Missing static must NOT block dynamic generation.

Regenerate from scratch:
- Retrieve existingDynamicProfile and ALL context below.
- Re-evaluate every existing dynamic label: Keep, Update, Refine, Replace, or Remove.
- Do NOT append blindly. Output the FULL latest dynamic understanding only.
- Do NOT use keyword matching or fixed label libraries. Infer semantically from all sources.

Information sources (use ALL, not only the newest):
- AI conversations, offline counselling transcripts, mood history, session summaries, care insights, existing dynamic profile, at-a-glance context, any case notes in context.

Philosophy:
- Current understanding, not permanent diagnosis. Reasonable inferences allowed without repeated evidence.
- Emerging interests, coping habits, personality tendencies may be added when meaningful.

Dynamic fields (open vocabulary — examples are illustrative ONLY):
- interests: hobbies, topics, preferences (e.g. Music, Basketball, Aquarium — or any semantically supported label)
- personality: behavioural tendencies (e.g. Sensitive, Reserved, Creative — or any reasonable trait)
- living_arrangement: family situation when expressed or reasonably inferred (e.g. Living with grandparents, Parents separated)
- coping_methods: emotional regulation behaviours (e.g. Listening to music, Bird watching, Watching aquarium videos)

Do NOT populate preferred_communication_style or current_challenges in dynamic_profile (those belong to static questionnaire / care insights).

Return ONLY valid JSON:
{
  "dynamic_profile": {
    "interests": [],
    "personality": [],
    "living_arrangement": "",
    "coping_methods": []
  }
}`

const MOOD_CHECKIN_LINE = /^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function uniqueItems(...arrays) {
  const seen = new Set()
  const out = []
  for (const arr of arrays) {
    for (const item of arr || []) {
      const tag = String(item).trim()
      const key = tag.toLowerCase()
      if (tag && !seen.has(key)) {
        seen.add(key)
        out.push(tag)
      }
    }
  }
  return out
}

function pickText(next, previous = '') {
  const trimmed = String(next || '').trim()
  if (trimmed) return trimmed
  return String(previous || '').trim()
}

export function normalizeDynamicProfile(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_DYNAMIC_PROFILE }
  return {
    interests: asArray(raw.interests),
    personality: asArray(raw.personality),
    preferred_communication_style: asArray(raw.preferred_communication_style),
    living_arrangement: pickText(raw.living_arrangement),
    current_challenges: asArray(raw.current_challenges),
    coping_methods: asArray(raw.coping_methods),
  }
}

/** Strip non-dynamic fields for AI output / purple tags on Youth Profile. */
export function profileDynamicFieldsForDisplay(profile) {
  const normalized = normalizeDynamicProfile(profile)
  return {
    interests: normalized.interests,
    personality: normalized.personality,
    living_arrangement: normalized.living_arrangement,
    coping_methods: normalized.coping_methods,
    preferred_communication_style: [],
    current_challenges: [],
  }
}

function staticProfileFromQuestionnaire(questionnaire) {
  if (!questionnaire) return null
  return {
    interests: asArray(questionnaire.interests),
    personality: asArray(questionnaire.personality),
    preferred_communication_style: asArray(questionnaire.preferred_communication_style),
    living_arrangement: pickText(questionnaire.living_arrangement),
    current_challenges: asArray(questionnaire.current_challenges),
    coping_methods: asArray(questionnaire.coping_methods),
  }
}

function exactDuplicateOfStatic(label, staticList) {
  const value = String(label || '').trim().toLowerCase()
  if (!value) return true
  return (staticList || []).some((item) => String(item).trim().toLowerCase() === value)
}

/** Remove exact duplicates of static questionnaire labels; keep enriched variants. */
export function dedupeDynamicAgainstStatic(dynamicProfile, questionnaire) {
  const dynamic = profileDynamicFieldsForDisplay(normalizeDynamicProfile(dynamicProfile))
  const staticP = staticProfileFromQuestionnaire(questionnaire)
  if (!staticP) return dynamic

  return {
    interests: dynamic.interests.filter((item) => !exactDuplicateOfStatic(item, staticP.interests)),
    personality: dynamic.personality.filter((item) => !exactDuplicateOfStatic(item, staticP.personality)),
    living_arrangement:
      dynamic.living_arrangement &&
      !exactDuplicateOfStatic(dynamic.living_arrangement, staticP.living_arrangement ? [staticP.living_arrangement] : [])
        ? dynamic.living_arrangement
        : dynamic.living_arrangement &&
            staticP.living_arrangement &&
            dynamic.living_arrangement.toLowerCase() === staticP.living_arrangement.toLowerCase()
          ? ''
          : dynamic.living_arrangement,
    coping_methods: dynamic.coping_methods.filter((item) => !exactDuplicateOfStatic(item, staticP.coping_methods)),
    preferred_communication_style: [],
    current_challenges: [],
  }
}

function youthChatLines(messages) {
  return (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter((line) => line && !MOOD_CHECKIN_LINE.test(line))
}

function youthTranscriptLines(transcript) {
  const lines = []
  for (const raw of String(transcript || '').split(/\n/)) {
    const line = raw.trim()
    if (!line) continue
    const tagged = line.match(/^(?:Youth|YOUTH|Client|Student)\s*[:\-]\s*(.+)$/i)
    if (tagged) lines.push(tagged[1].trim())
  }
  return lines
}

export function collectDynamicProfileContext({
  questionnaire = null,
  existingDynamic = null,
  messages = [],
  aiSessions = [],
  offlineSessions = [],
  overallSummary = '',
  careInsights = null,
} = {}) {
  const youthSpeech = youthChatLines(messages).join('\n')
  const offline = (offlineSessions || []).filter((s) => s.status !== 'draft')
  const sessionSummaries = [
    ...(aiSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...offline.map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]
  const offlineTranscripts = offline
    .map((s) => youthTranscriptLines(s.transcript).join('\n'))
    .filter(Boolean)
    .join('\n')
  const moods = (aiSessions || []).map((s) => s.mood_check_in).filter(Boolean)

  return {
    staticProfile: staticProfileFromQuestionnaire(questionnaire),
    existingDynamicProfile: profileDynamicFieldsForDisplay(normalizeDynamicProfile(existingDynamic)),
    youthSpeech,
    sessionSummaries,
    offlineTranscripts,
    moodHistory: moods,
    overallSummary: String(overallSummary || '').trim(),
    careInsights: careInsights || null,
  }
}

export function isDynamicProfileQuality(profile) {
  return hasDynamicProfileData(profileDynamicFieldsForDisplay(normalizeDynamicProfile(profile)))
}

/** Fresh dynamic profile — replaces previous stored dynamic wording (no incremental merge). */
export function regenerateDynamicProfile({ aiGenerated = null, questionnaire = null } = {}) {
  const normalized = profileDynamicFieldsForDisplay(normalizeDynamicProfile(aiGenerated))
  return dedupeDynamicAgainstStatic(normalized, questionnaire)
}

/**
 * Legacy name: when generated has data, REPLACE; never accumulate arrays from previous.
 */
export function mergeDynamicProfile(existing, generated) {
  const gen = regenerateDynamicProfile({ aiGenerated: generated, questionnaire: null })
  if (hasDynamicProfileData(gen)) return gen
  return profileDynamicFieldsForDisplay(normalizeDynamicProfile(existing))
}

export function mergeDynamicProfileForPersist({ savedProfile, generatedProfile, questionnaire = null }) {
  const generated = regenerateDynamicProfile({ aiGenerated: generatedProfile, questionnaire })
  const saved = profileDynamicFieldsForDisplay(normalizeDynamicProfile(savedProfile))
  if (!hasDynamicProfileData(generated)) return saved
  return preserveQualityDynamicProfile(saved, generated)
}

export function buildYouthSpeechCorpus({ messages = [], offlineSessions = [] } = {}) {
  const parts = [...youthChatLines(messages)]
  for (const session of offlineSessions || []) {
    parts.push(...youthTranscriptLines(session.transcript))
  }
  return parts.join('\n').trim()
}

export function buildDynamicProfileFromYouthSpeech() {
  return { ...EMPTY_DYNAMIC_PROFILE }
}

export function buildDynamicProfileFallback() {
  return profileDynamicFieldsForDisplay({ ...EMPTY_DYNAMIC_PROFILE })
}

export function filterDynamicProfileByEvidence(profile) {
  return profileDynamicFieldsForDisplay(profile)
}

/** Display / read path — static questionnaire is never modified; dynamic comes from stored AI profile only. */
export function resolveDynamicProfile({ savedProfile } = {}) {
  return profileDynamicFieldsForDisplay(normalizeDynamicProfile(savedProfile))
}

export function mergeDynamicProfileWithSpeechEvidence({ savedProfile, generatedProfile, questionnaire = null }) {
  return mergeDynamicProfileForPersist({ savedProfile, generatedProfile, questionnaire })
}

export function hasDynamicProfileData(profile) {
  const normalized = profileDynamicFieldsForDisplay(profile)
  return Boolean(
    normalized.interests.length ||
      normalized.personality.length ||
      normalized.living_arrangement ||
      normalized.coping_methods.length,
  )
}
