import { EMPTY_DYNAMIC_PROFILE } from './aiContentStubs.js'
import { DYNAMIC_PROFILE_QUALITY_EXAMPLES } from './profileBundlePrompts.js'
import { preserveQualityDynamicProfile } from './profileQuality.js'

export { EMPTY_DYNAMIC_PROFILE }

/** Questionnaire-only on Youth Profile grid — never AI-filled on static side. */
export const STATIC_ONLY_PROFILE_FIELDS = ['preferred_communication_style', 'current_challenges']

/** AI-only on Youth Profile grid — hidden when filter is Static. */
export const DYNAMIC_ONLY_PROFILE_FIELDS = ['personality', 'living_arrangement', 'coping_methods']

/** Fields AI may populate in Dynamic Profile (open vocabulary). */
export const DYNAMIC_PROFILE_FIELDS = ['interests', 'personality', 'living_arrangement', 'coping_methods']

/** Youth Profile filter: which category cards appear per view (all / static / dynamic). */
export function isYouthProfileFieldVisible(fieldKey, view) {
  if (view === 'all') return true
  if (view === 'static') return !DYNAMIC_ONLY_PROFILE_FIELDS.includes(fieldKey)
  if (view === 'dynamic') return !STATIC_ONLY_PROFILE_FIELDS.includes(fieldKey)
  return true
}

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

export function mergeDynamicProfileForPersist({
  savedProfile,
  generatedProfile,
  questionnaire = null,
  messages = [],
  aiSessions = [],
  offlineSessions = [],
} = {}) {
  const generated = regenerateDynamicProfile({ aiGenerated: generatedProfile, questionnaire })
  const saved = profileDynamicFieldsForDisplay(normalizeDynamicProfile(savedProfile))
  const fallback = buildDynamicProfileFallbackFromContext({
    questionnaire,
    existingDynamic: saved,
    messages,
    aiSessions,
    offlineSessions,
  })
  if (hasDynamicProfileData(generated)) return preserveQualityDynamicProfile(saved, generated)
  if (hasDynamicProfileData(fallback)) return preserveQualityDynamicProfile(saved, fallback)
  if (hasDynamicProfileData(saved)) return saved
  return saved
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

/** Rule-based dynamic profile when OpenRouter is unavailable — mirrors cloud behaviour after AI chat. */
export function buildDynamicProfileFallbackFromContext(context = {}) {
  const ctx =
    context.youthSpeech != null || context.staticProfile != null
      ? context
      : collectDynamicProfileContext(context)
  const corpus = [ctx.youthSpeech, ctx.offlineTranscripts, ...(ctx.sessionSummaries || [])]
    .filter(Boolean)
    .join('\n')
  const questionnaire = context.questionnaire || null
  const staticInterests = asArray(ctx.staticProfile?.interests || questionnaire?.interests)

  if (!corpus.trim() && !(ctx.moodHistory || []).length) {
    return buildDynamicProfileFallback()
  }

  const personality = []
  const coping_methods = []
  const interests = []
  let living_arrangement = ''

  const pushUnique = (target, items, limit = 4) => {
    const seen = new Set(target.map((item) => String(item).toLowerCase()))
    for (const item of items) {
      const tag = String(item || '').trim()
      const key = tag.toLowerCase()
      if (!tag || seen.has(key)) continue
      seen.add(key)
      target.push(tag)
      if (target.length >= limit) break
    }
  }

  if (/suicide|kill myself|hurt myself|想自杀|self.?harm/i.test(corpus)) {
    pushUnique(personality, ['Emotionally distressed', 'May need gentle reassurance'])
    pushUnique(coping_methods, ['Reaching out through after-hours AI chat'])
  }

  if (
    /sad|stressed|overwhelmed|难过|压力|崩溃/i.test(corpus) ||
    (ctx.moodHistory || []).some((m) => /sad|stressed|overwhelmed/i.test(String(m)))
  ) {
    pushUnique(personality, ['Carrying low mood', 'May appear withdrawn when overwhelmed'])
  }

  if (
    /family|parent|home|爸妈|父母|吵架|conflict/i.test(corpus) ||
    asArray(questionnaire?.current_challenges).some((c) => /family/i.test(String(c)))
  ) {
    living_arrangement = 'Family tension affecting home environment'
    pushUnique(personality, ['Sensitive to family stress'])
  }

  if (/school|exam|homework|class|学业|bully|peer/i.test(corpus)) {
    pushUnique(personality, ['School stress affecting daily mood'])
  }

  if (/minecraft|mobile game|gaming|game/i.test(corpus)) {
    pushUnique(interests, ['Mobile gaming as emotional refuge'])
    pushUnique(coping_methods, ['Immersive gaming for comfort'])
  } else if (staticInterests.some((item) => /game/i.test(item))) {
    pushUnique(coping_methods, ['Mobile gaming for relaxation'])
  }

  if (/piano|guitar|violin|drums|cello|ukulele/i.test(corpus)) {
    const instrument = /piano/i.test(corpus)
      ? 'Piano'
      : /guitar/i.test(corpus)
        ? 'Guitar'
        : /violin/i.test(corpus)
          ? 'Violin'
          : 'Music'
    pushUnique(interests, [instrument])
    pushUnique(coping_methods, ['Music as emotional outlet'])
  } else if (/music|sing|song/i.test(corpus)) {
    pushUnique(interests, ['Music'])
    pushUnique(coping_methods, ['Listening to or playing music for comfort'])
  }

  if (/bird|leaf|headphone|aquarium|quiet|draw|art/i.test(corpus)) {
    pushUnique(coping_methods, ['Quiet sensory activities for self-regulation'])
  }

  if (!personality.length && corpus.trim()) {
    pushUnique(personality, ['Opening up gradually in after-hours chat'])
  }

  return dedupeDynamicAgainstStatic(
    profileDynamicFieldsForDisplay({
      interests,
      personality,
      living_arrangement,
      coping_methods,
    }),
    questionnaire,
  )
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
