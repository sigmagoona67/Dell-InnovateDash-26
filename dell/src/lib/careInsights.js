import { CARE_INSIGHTS_QUALITY_EXAMPLES } from './profileBundlePrompts.js'
import { preserveQualityCareInsights } from './profileQuality.js'
import { isCasualPositiveMessage } from './youthChatReply.js'

const MOOD_CHECKIN_LINE = /^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i

export const CARE_INSIGHTS_PROMPT = `Generate Current Care Insights — practical information youth workers need before interacting with this youth today.

${CARE_INSIGHTS_QUALITY_EXAMPLES}

Purpose: answer how the youth is currently doing, the biggest concern right now, how staff should approach them today, and what the latest interaction revealed.

Unlike At a Glance (overall life story), Current Care Insights focus on PRESENT condition and IMMEDIATE support needs.

CRITICAL — regenerate from scratch:
- Use ALL provided context. Write completely NEW content.
- Do NOT append, preserve, or reuse previous Current Care Insights wording.
- Do NOT repeat At a Glance narrative or Youth Profile labels verbatim.
- Synthesise understanding; do NOT summarise conversations chronologically.
- Open vocabulary only — no keyword lists or hardcoded label libraries.

Information sources (use ALL, not only the newest):
- AI conversations, offline counselling, mood check-ins, dynamic profile, at-a-glance, existing care insights, session summaries, questionnaire (context only), any case notes in context.

Fields:

current_state (array, 1–3 items):
- How the youth appears RIGHT NOW — emotional presentation and behavioural state staff would likely observe today.
- Natural observations (e.g. emotionally withdrawn, sleeping poorly, engaging more openly).
- Illustrative examples only — generate any appropriate observation.

main_risk (array, 1–3 items):
- The most important issue(s) currently affecting wellbeing — weigh long-term patterns AND recent interactions.
- Focus on what matters most today. Illustrative examples only.

best_communication_approach (array, 1–5 items):
- Practical suggestions for staff: tone, pacing, validation, conversation style, opening topics.
- Tailored to this youth's current profile. Illustrative examples only.

latest_change (string, 1–2 short sentences):
- Latest Interaction Insight — the most meaningful takeaway from the MOST RECENT interaction only (AI chat, offline session, or mood check-in).
- Use latestInteraction in context to identify which interaction is latest.
- Do NOT compare with previous interactions. Do NOT describe the conversation process.
- Observation-based, professional, concise.
- Do NOT use: "The youth discussed", "During this session", "In the latest AI chat", "In the latest counselling session".

Return ONLY valid JSON:
{
  "current_state": [],
  "main_risk": [],
  "best_communication_approach": [],
  "latest_change": ""
}`

export const BANNED_LATEST_CHANGE_PATTERNS = [
  /\bthe youth discussed\b/i,
  /\bthe youth shared\b/i,
  /\bthe youth reported\b/i,
  /\bduring this session\b/i,
  /\bin the latest ai chat\b/i,
  /\bin the latest counselling session\b/i,
  /\bin the latest session\b/i,
  /\bthe conversation focused on\b/i,
]

export const EMPTY_CARE_INSIGHTS = {
  current_state: [],
  main_risk: [],
  best_communication_approach: [],
  latest_change: '',
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function uniqueItems(items, limit = 6) {
  const seen = new Set()
  const out = []
  for (const item of items || []) {
    const tag = String(item).trim()
    const key = tag.toLowerCase()
    if (tag && !seen.has(key)) {
      seen.add(key)
      out.push(tag)
    }
  }
  return out.slice(0, limit)
}

export function normalizeCareInsights(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_CARE_INSIGHTS }
  return {
    current_state: uniqueItems(asArray(raw.current_state), 3),
    main_risk: uniqueItems(asArray(raw.main_risk), 3),
    best_communication_approach: uniqueItems(asArray(raw.best_communication_approach), 5),
    latest_change: String(raw.latest_change || '').trim(),
  }
}

export function isLatestChangeQuality(text) {
  const value = String(text || '').trim()
  if (!value) return false
  if (BANNED_LATEST_CHANGE_PATTERNS.some((p) => p.test(value))) return false
  return true
}

export function isCareInsightsQuality(insights) {
  const normalized = normalizeCareInsights(insights)
  return Boolean(
    normalized.current_state.length ||
      normalized.main_risk.length ||
      normalized.best_communication_approach.length ||
      isLatestChangeQuality(normalized.latest_change),
  )
}

export function hasCareInsightsData(insights) {
  return isCareInsightsQuality(insights)
}

function youthChatLines(messages = []) {
  return (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter((line) => line && !MOOD_CHECKIN_LINE.test(line))
}

function approvedOffline(offlineSessions = []) {
  return [...(offlineSessions || [])].filter((s) => s.status !== 'draft')
}

function parseAt(value) {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

export function resolveLatestInteraction({ messages = [], aiSessions = [], offlineSessions = [] } = {}) {
  const candidates = []

  const youthMsgs = (messages || []).filter((m) => m.sender === 'youth')
  if (youthMsgs.length) {
    const last = youthMsgs[youthMsgs.length - 1]
    const speech = String(last.message || '').trim()
    if (speech && !MOOD_CHECKIN_LINE.test(speech)) {
      candidates.push({
        type: 'ai_conversation',
        at: last.created_at || null,
        youthSpeech: speech,
        summary: '',
      })
    }
  }

  for (const session of aiSessions || []) {
    if (session.mood_check_in) {
      candidates.push({
        type: 'mood_check_in',
        at: session.session_date || null,
        mood: session.mood_check_in,
        summary: String(session.ai_summary || '').trim(),
      })
    } else if (session.ai_summary?.trim()) {
      candidates.push({
        type: 'ai_conversation',
        at: session.session_date || null,
        summary: String(session.ai_summary || '').trim(),
      })
    }
  }

  for (const session of approvedOffline(offlineSessions)) {
    if (session.ai_summary?.trim() || session.transcript?.trim()) {
      candidates.push({
        type: 'offline_counselling',
        at: session.session_date || session.updated_at || session.approved_at || null,
        summary: String(session.ai_summary || '').trim(),
        transcriptSample: String(session.transcript || '').slice(0, 2000),
      })
    }
  }

  candidates.sort((a, b) => parseAt(b.at) - parseAt(a.at))
  return candidates[0] || null
}

export function collectCareInsightsContext({
  youthName = 'This youth',
  questionnaire = null,
  dynamicProfile = null,
  overallSummary = '',
  existingCareInsights = null,
  messages = [],
  aiSessions = [],
  offlineSessions = [],
  latestExchangeSummary = '',
} = {}) {
  const youthSpeech = youthChatLines(messages).join('\n')
  const offline = approvedOffline(offlineSessions)
  const sessionSummaries = [
    ...(aiSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...offline.map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]
  const moods = (aiSessions || []).map((s) => s.mood_check_in).filter(Boolean).map(String)

  return {
    youthName: youthName || 'This youth',
    questionnaire: questionnaire || null,
    dynamicProfile: dynamicProfile || null,
    overallSummary: String(overallSummary || '').trim(),
    existingCareInsights: normalizeCareInsights(existingCareInsights),
    youthSpeech,
    sessionSummaries,
    moodHistory: moods,
    latestInteraction: resolveLatestInteraction({ messages, aiSessions, offlineSessions }),
    latestExchangeSummary: String(latestExchangeSummary || '').trim(),
  }
}

/** Full replace when AI generated meets quality bar; otherwise saved, then rule-based fallback from context. */
export function regenerateCareInsights({ aiGenerated = {}, saved = {}, context = null } = {}) {
  const generated = normalizeCareInsights(aiGenerated)
  if (isCareInsightsQuality(generated)) {
    return preserveQualityCareInsights(normalizeCareInsights(saved), generated)
  }
  const savedNorm = normalizeCareInsights(saved)
  if (isCareInsightsQuality(savedNorm)) return savedNorm
  if (context) {
    const ctx =
      context.youthSpeech != null || context.latestInteraction != null
        ? context
        : collectCareInsightsContext(context)
    const fallback = buildCareInsightsFallbackFromContext(ctx)
    if (isCareInsightsQuality(fallback)) return fallback
  }
  return savedNorm
}

/** Display / read path — saved DB care insights only. */
export function resolveCareInsights({ savedProfile } = {}) {
  return normalizeCareInsights(savedProfile)
}

export function buildCareInsightsFallback() {
  return { ...EMPTY_CARE_INSIGHTS }
}

function pushUnique(target, items, limit = 5) {
  const seen = new Set(target.map((item) => String(item).toLowerCase()))
  for (const item of items || []) {
    const tag = String(item || '').trim()
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    target.push(tag)
    if (target.length >= limit) break
  }
}

/** Rule-based care insights when OpenRouter is unavailable — mirrors InsForge live behaviour. */
export function buildCareInsightsFallbackFromContext(context = {}) {
  const youthSpeech = String(context.youthSpeech || '').trim()
  const latest = context.latestInteraction || {}
  const latestText = String(latest.youthSpeech || latest.summary || context.latestExchangeSummary || '').trim()
  const corpus = [youthSpeech, latestText].filter(Boolean).join('\n')
  const recentMood = String(latest.mood || (context.moodHistory || [])[0] || '').trim()
  const challenges = asArray(context.questionnaire?.current_challenges)

  if (!corpus && !recentMood && !challenges.length) {
    return { ...EMPTY_CARE_INSIGHTS }
  }

  const current_state = []
  const main_risk = []
  const best_communication_approach = []
  let latest_change = ''

  if (/想自杀|自杀|不想活|自伤|suicide|kill myself|hurt myself|self.?harm|want to die/i.test(corpus)) {
    pushUnique(current_state, ['Expressing suicidal ideation', 'Emotionally distressed'], 3)
    pushUnique(main_risk, ['Suicide risk', 'Acute emotional overwhelm'], 3)
    pushUnique(best_communication_approach, [
      'Validate feelings calmly without judgment',
      'Check immediate safety and whether anyone is with them',
      'Encourage contacting a trusted adult or crisis line tonight',
    ], 5)
    latest_change =
      'Shared suicidal thoughts in after-hours AI chat and may need urgent, warm follow-up.'
  } else if (/霸凌|bully|欺负|扔东西/i.test(corpus)) {
    pushUnique(current_state, ['Feeling targeted or unsafe with peers', 'Emotionally hurt'], 3)
    pushUnique(main_risk, ['Bullying or peer mistreatment', 'School safety concerns'], 3)
    pushUnique(best_communication_approach, [
      'Acknowledge that mistreatment is not their fault',
      'Explore who can support them at school tomorrow',
      'Keep questions concrete about what happened and who was involved',
    ], 5)
    latest_change = 'Reported bullying or peer targeting in recent after-hours contact.'
  } else if (/爸妈|父母|吵架|hitting|hit me|abuse|family conflict/i.test(corpus) || challenges.some((c) => /family/i.test(c))) {
    pushUnique(current_state, ['Carrying family-related stress', 'May feel unsafe or unheard at home'], 3)
    pushUnique(main_risk, ['Family conflict', 'Home environment stress'], 3)
    pushUnique(best_communication_approach, [
      'Start with safety and what feels hardest right now',
      'Avoid minimizing — family stress can feel overwhelming',
      'Explore trusted adults they could reach out to',
    ], 5)
    latest_change = 'Family tension or conflict surfaced as a key stressor in recent contact.'
  } else if (isCasualPositiveMessage(latestText) && !/suicide|kill myself|self.?harm/i.test(corpus)) {
    pushUnique(current_state, ['Sharing interests or small comforts', 'Engaging openly in chat'], 3)
    pushUnique(main_risk, ['Routine emotional support'], 3)
    pushUnique(best_communication_approach, [
      'Acknowledge what they enjoy before exploring harder topics',
      'Use a warm, curious tone about their interests',
      'Let them lead if they want to stay on lighter topics',
    ], 5)
    latest_change = `Mentioned "${latestText.replace(/\s+/g, ' ').slice(0, 80)}" — a positive topic worth encouraging.`
  } else if (/sad|stressed|overwhelmed|难过|压力|崩溃/i.test(corpus) || /sad|stressed|overwhelmed/i.test(recentMood)) {
    const moodLabel = /sad/i.test(corpus + recentMood)
      ? 'sad'
      : /stressed/i.test(corpus + recentMood)
        ? 'stressed'
        : 'overwhelmed'
    pushUnique(current_state, [`Presenting as ${moodLabel}`, 'May need gentle emotional support'], 3)
    pushUnique(main_risk, ['Emotional overwhelm', 'Low mood affecting daily coping'], 3)
    pushUnique(best_communication_approach, [
      'Use a calm, unhurried tone',
      'Reflect their words before offering suggestions',
      'Ask what would feel most helpful right now',
    ], 5)
    latest_change = `Recent mood check-in or messages suggest sustained ${moodLabel} feelings worth exploring.`
  }

  for (const challenge of challenges.slice(0, 2)) {
    pushUnique(main_risk, [String(challenge)], 3)
  }

  if (!best_communication_approach.length) {
    pushUnique(best_communication_approach, [
      'Use a calm, unhurried tone',
      'Reflect what they shared before offering suggestions',
      'Leave space for them to share at their own pace',
    ], 5)
  }

  if (!latest_change && latestText) {
    const snippet = latestText.replace(/\s+/g, ' ').slice(0, 90)
    latest_change = `Recent contact included themes around "${snippet}" that may benefit from gentle follow-up.`
  } else if (!latest_change && recentMood) {
    latest_change = `Latest mood check-in was "${recentMood}" — worth exploring what has been weighing on them.`
  }

  return normalizeCareInsights({
    current_state,
    main_risk,
    best_communication_approach,
    latest_change,
  })
}
