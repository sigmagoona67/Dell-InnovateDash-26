import { createClient } from '../backend/lib/createClient.js'

// Keep in sync with functions/shared/profileBundlePrompts.ts + profileQuality.ts
const PROFILE_GENERATION_TEMPERATURE = 0.35

const DYNAMIC_PROFILE_QUALITY_EXAMPLES = `Youth Profile quality standard (dynamic_profile):
- Use specific, youth-evidenced labels — NOT generic categories.
- Good interests: "bird watching", "collecting leaves", "aquarium videos", "nature walks"
- Bad interests: "hobbies", "nature", "activities"
- Good personality: "sensitive", "introspective", "creative", "quiet and observant"
- Bad personality: "nice", "normal", "typical teenager"
- Good coping_methods: "wearing headphones for quiet", "watching calming jellyfish videos", "solitary park visits"
- Bad coping_methods: "coping strategies", "self-care", "relaxation"
- living_arrangement: only when family/home context is expressed or reasonably inferred
- Do NOT populate preferred_communication_style or current_challenges in dynamic_profile`

const CARE_INSIGHTS_QUALITY_EXAMPLES = `Current Care Insights quality standard:
- current_state (1–3): present-moment presentation staff would observe TODAY (e.g. "sad", "seeking solitude", "emotionally withdrawn")
- main_risk (1–3): actionable concerns for staff TODAY (e.g. "isolation", "emotional overwhelm") — not vague labels like "stress"
- best_communication_approach (1–5): concrete staff actions (e.g. "Provide space for reflection", "Validate feelings before problem-solving", "Approach gently without pressure to talk")
- latest_change: 1–2 observation-based sentences from the LATEST interaction only; professional tone; no conversation process narration
- BANNED in latest_change: "The youth discussed", "The youth shared", "During this session", "In the latest AI chat", "In the latest counselling session"`

const STAFF_EDITED_SOURCES_RULE = `## Staff-edited sources (staffEditedSources)
When staffEditedSources appears in the payload, it contains verified youth worker corrections saved in the database.
Treat as primary case information alongside conversations, transcripts, and questionnaires.
Integrate into full regeneration per all locked rules above; synthesise — do not copy verbatim unless still accurate.
Do not contradict staff corrections without clear new evidence from other sources.`

const FULL_PROFILE_BUNDLE_PROMPT = `Regenerate the youth's FULL profile and staff insights in ONE response using ALL context provided.

Regenerate from scratch — output the COMPLETE latest understanding. Do NOT append or reuse previous wording.

STATIC vs DYNAMIC:
- staticProfile (questionnaire) is context only. NEVER copy questionnaire labels into dynamic_profile unless adding NEW meaningful context beyond static wording.
- Dynamic and Static are independent. Missing questionnaire must NOT block dynamic generation.

${DYNAMIC_PROFILE_QUALITY_EXAMPLES}

${CARE_INSIGHTS_QUALITY_EXAMPLES}

Sections:

1) overall_summary — At a Glance: MUST follow the dedicated AT_A_GLANCE system rules in atAGlanceContext. Synthesise the youth's story (not labels). Fair whole-case integration — do NOT prioritise any single source. Questionnaire is optional background only; never a label list. No source attribution. Full rewrite from scratch.

2) dynamic_profile — interests, personality, living_arrangement, coping_methods only (open vocabulary, specific labels)

3) current_state — 1–3 tags: how youth appears RIGHT NOW

4) main_risk — 1–3 tags: most important current wellbeing concerns for staff today

5) best_communication_approach — 1–5 practical, concrete staff suggestions tailored to this youth

6) latest_change — 1–2 sentences: meaningful insight from latestInteraction ONLY

7) current_concern — ONE short sentence, 5–15 words. The single most important issue requiring youth worker attention RIGHT NOW. Not a full case summary. No interests/personality lists. No source attribution.

8) case_preview — 2–3 short sentences, approximately 30–60 words. Dashboard card preview before opening full profile. Mention main concern and key behavioural patterns; include meaningful coping behaviours if they help understanding. NOT At a Glance, NOT a session summary, NOT chronological. No source attribution.

Minimum bar when source material exists:
- Populate dynamic_profile with at least 2 fields (e.g. interests + coping_methods)
- Populate at least 3 of 4 care insight fields (current_state, main_risk, best_communication_approach, latest_change)

${STAFF_EDITED_SOURCES_RULE}

Return ONLY valid JSON:
{
  "overall_summary": "",
  "dynamic_profile": {
    "interests": [],
    "personality": [],
    "living_arrangement": "",
    "coping_methods": []
  },
  "current_state": [],
  "main_risk": [],
  "best_communication_approach": [],
  "latest_change": "",
  "current_concern": "",
  "case_preview": ""
}`

const DYNAMIC_PROFILE_PROMPT = `Generate dynamic_profile as the AI's current understanding of this youth.

${DYNAMIC_PROFILE_QUALITY_EXAMPLES}

STATIC vs DYNAMIC (critical):
- Static Profile comes ONLY from the youth questionnaire. You receive it as staticProfile for context only.
- NEVER copy questionnaire labels into dynamic_profile unless you add NEW meaningful context beyond static wording.
- Dynamic and Static are independent. Missing static must NOT block dynamic generation.

Regenerate from scratch:
- Re-evaluate ALL context. Output the FULL latest dynamic understanding only.
- Do NOT append blindly. Do NOT use keyword matching or fixed label libraries.

Information sources (use ALL):
- AI conversations, offline transcripts, mood history, session summaries, existing dynamic profile, care insights, at-a-glance context.

Return ONLY valid JSON:
{
  "dynamic_profile": {
    "interests": [],
    "personality": [],
    "living_arrangement": "",
    "coping_methods": []
  }
}`

const CARE_INSIGHTS_PROMPT = `Generate Current Care Insights — practical information youth workers need before interacting with this youth today.

${CARE_INSIGHTS_QUALITY_EXAMPLES}

Purpose: present condition and IMMEDIATE support needs — not a life story.

CRITICAL — regenerate from scratch:
- Use ALL provided context. Write completely NEW content.
- Do NOT append or reuse previous Current Care Insights wording.
- Synthesise understanding; do NOT summarise conversations chronologically.

Information sources (use ALL):
- AI conversations, offline counselling, mood check-ins, dynamic profile, at-a-glance, session summaries, questionnaire (context only).

${STAFF_EDITED_SOURCES_RULE}

Return ONLY valid JSON:
{
  "current_state": [],
  "main_risk": [],
  "best_communication_approach": [],
  "latest_change": ""
}`

const GENERIC_DYNAMIC_LABELS = new Set([
  'hobbies', 'activities', 'nature', 'music', 'coping strategies', 'self-care',
  'relaxation', 'stress', 'anxiety', 'normal', 'typical teenager', 'nice',
])

function dynamicProfileQualityScore(profile) {
  if (!profile || typeof profile !== 'object') return 0
  let score = 0
  for (const field of ['interests', 'personality', 'coping_methods']) {
    for (const item of profile[field] || []) {
      const tag = String(item || '').trim()
      if (!tag) continue
      if (GENERIC_DYNAMIC_LABELS.has(tag.toLowerCase())) score += 0.5
      else score += tag.split(/\s+/).length >= 2 ? 2 : 1
    }
  }
  if (String(profile.living_arrangement || '').trim()) score += 2
  return score
}

function careInsightsQualityScore(insights) {
  if (!insights || typeof insights !== 'object') return 0
  let score = 0
  score += (insights.current_state || []).length * 2
  score += (insights.main_risk || []).length * 2
  score += (insights.best_communication_approach || []).length
  if (String(insights.latest_change || '').trim()) score += 3
  return score
}

function preserveQualityDynamicProfile(saved, generated) {
  if (!hasDynamicProfileData(generated)) return saved
  if (!hasDynamicProfileData(saved)) return generated
  const savedScore = dynamicProfileQualityScore(saved)
  const generatedScore = dynamicProfileQualityScore(generated)
  if (generatedScore >= Math.max(3, savedScore * 0.75)) return generated
  return saved
}

function preserveQualityCareInsights(saved, generated) {
  if (!isCareInsightsQuality(generated)) return saved
  if (!isCareInsightsQuality(saved)) return generated
  const savedScore = careInsightsQualityScore(saved)
  const generatedScore = careInsightsQualityScore(generated)
  if (generatedScore >= Math.max(4, savedScore * 0.75)) return generated
  return saved
}

const AT_A_GLANCE_RULE_FALLBACK_PATTERNS = [
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

function isAtAGlanceRuleFallback(text: string) {
  const value = String(text || '').trim()
  if (!value) return false
  return AT_A_GLANCE_RULE_FALLBACK_PATTERNS.some((p) => p.test(value))
}

function hasLockedAtAGlanceQuality(text: string) {
  return isAtAGlanceQuality(text) && !isAtAGlanceRuleFallback(text)
}

function preserveQualityAtAGlance(saved: unknown, generated: unknown) {
  const savedText = String(saved || '').trim()
  const genText = String(generated || '').trim()
  if (hasLockedAtAGlanceQuality(genText)) return genText
  if (hasLockedAtAGlanceQuality(savedText)) return savedText
  if (isAtAGlanceQuality(genText)) return genText
  if (isAtAGlanceQuality(savedText)) return savedText
  return genText || savedText
}

function hasQualityProfileBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') return false
  const careFields = [
    (bundle.current_state || []).length > 0,
    (bundle.main_risk || []).length > 0,
    (bundle.best_communication_approach || []).length > 0,
    Boolean(String(bundle.latest_change || '').trim()),
  ].filter(Boolean).length
  return hasDynamicProfileData(bundle.dynamic_profile) && careFields >= 3
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const CHAT_MODEL = Deno.env.get('OPENROUTER_CHAT_MODEL') || 'openai/gpt-4o'

const INSIGHTS_SYSTEM_PROMPT = `Content generation rules are not configured. Return ONLY valid JSON with this shape. Use empty strings or arrays when unsure.
{
  "current_state": [],
  "main_risk": [],
  "best_communication_approach": [],
  "latest_change": "",
  "overall_summary": "",
  "dynamic_profile": {
    "interests": [],
    "personality": [],
    "preferred_communication_style": [],
    "living_arrangement": "",
    "current_challenges": [],
    "coping_methods": []
  },
  "risk_level": "low",
  "morning_brief": {
    "overnight_summary": "",
    "follow_up_priority": "routine"
  }
}`

// Locked youth chat reply quality (v2026-06-10 — image-2 depth). Sync with src/lib/youthChatReply.js
const MOOD_REPLY_SAD =
  "I'm sorry to hear that you're feeling sad today. It's okay to have those feelings, and it's important to acknowledge them. If you'd like to share more about what's been making you feel this way, I'm here to listen. • Sometimes writing down your thoughts can help clarify what's on your mind • Music or drawing can be a soothing way to express feelings • If there's something specific that's weighing on you, talking it through might help lighten the load • Remember that it's okay to seek comfort in small things you enjoy. Is there anything in particular that's been bothering you or something that could make you feel a bit better today?"

const MOOD_REPLIES = {
  Good: "I'm glad to hear you're feeling good today. What's been going well for you?",
  Okay:
    "Thank you for checking in. I'm here with you — would you like to talk about your day? • A short walk or a favourite snack can sometimes help you settle • If something is on your mind, you can share as much or as little as you like. What would feel most helpful to talk about right now?",
  Sad: MOOD_REPLY_SAD,
  Stressed:
    "Thank you for sharing that — it sounds like today may feel heavy, and that matters. I'm here with you. • Try naming one thing that feels most stressful right now — sometimes that alone helps • A few slow breaths or stepping away for five minutes can take the edge off • Small comforts you enjoy are allowed, even on hard days • You do not have to solve everything tonight. What part of today felt heaviest?",
  Overwhelmed:
    "That sounds really tough. Thank you for trusting me with how you feel — we can take this one step at a time, and I'm here with you. • Focus on the very next small step, not the whole problem • Let yourself pause before responding to what feels overwhelming • Tell a trusted adult or your youth worker if things are piling up • Rest and hydration matter more than you might think when you are overloaded. What feels most overwhelming right now?",
}

type ChatContext = {
  preferredName: string
  staffName: string | null
  lastOfflineSummary: string | null
  recentAiSummary: string | null
  latestChange: string | null
}

function buildChatSystemPrompt(
  ctx: ChatContext,
  mode: 'chat' | 'mood' | 'greeting' = 'chat',
  latestMessage = '',
  { hasHistory = false } = {},
) {
  const staffLabel = ctx.staffName || 'your assigned youth worker'

  const latestBlock = latestMessage.trim()
    ? `\n\nTHE YOUTH'S LATEST MESSAGE (you must respond to THIS first):\n"${latestMessage.trim()}"`
    : ''

  const historyBlock = hasHistory
    ? '\nYou will see prior messages in this session for context. Address the LATEST message first; you may gently connect to earlier topics if the youth is continuing the same struggle.'
    : ''

  let prompt = `You are CareBridge AI — the after-hours extension of ${staffLabel}'s youth support team for ${ctx.preferredName}.
You are ChatGPT: warm, intelligent, and natural. Every reply is generated by you — not a template.
Offer unhurried emotional companionship until staff return (about 9am–6pm).${historyBlock}${latestBlock}

LANGUAGE (critical — same quality in both):
- Reply in the SAME language as the youth's LATEST message. English in → full English out. Chinese in → Chinese out.
- English and Chinese must have EQUAL depth, structure, and care. NEVER give a short generic English reply if the topic is serious.
- If they switch language mid-session, follow the latest message language but you may reference what they shared earlier.

REPLY FORMAT (always — both languages):
- Light check-in: Chinese 80–120 chars OR English 80–100 words.
- Distress, abuse, family conflict, bullying, anhedonia ("only X makes me feel better"): Chinese 200–450 chars OR English 120–200 words — multiple short paragraphs.
- Structure:
  1) Reflect their exact words back (prove you read them)
  2) Safety check if relevant — never ask duration if they already said 很久/很久了/一直/for a long time/keep hitting/scolding
  3) Three or four practical suggestions as bullet lines starting with "•"
  4) Normalise feelings briefly
  5) End with 1–2 gentle questions about something NOT already answered

CHINESE example (youth: "想自杀我崩溃很久了"):
"听到你说想自杀，而且已经崩溃很久了，我真的很心疼你，也很担心你的安全。你现在安全吗？身边有没有人可以陪着你？ • ..."

ENGLISH example (youth: "only playing minecraft can make me feel better"):
"Hearing you say that only playing Minecraft helps you feel a bit better, I'm glad you have something that comforts you — and I also hear how hard things have been when that's the only relief. • Notice what part of the game helps most: building, exploring, or a quiet world of your own • Keep gentle limits so it stays restorative • If things at home are still heavy, you don't have to carry that alone — tell a trusted adult or your youth worker • Plan one small comfort ritual before or after you play. It's understandable to reach for what helps. What do you enjoy most in Minecraft right now?"

ENGLISH example (youth: "my parents keep hitting me"):
"Hearing you say your parents keep hitting you, I'm really worried about your safety — and I'm so sorry you're going through this. Are you safe right now? Is anyone with you? • You do not deserve to be hit — this is not your fault • Tell a trusted teacher, counselor, or youth worker as soon as you can • If you are in immediate danger, contact local emergency services or child protection • Write down what happened if you can — it can help when you ask for support. Feeling scared or angry is completely understandable. Can you tell me where you are right now and whether the hitting happened today?"

ENGLISH example (youth: "I'm feeling Sad today" or school/sensory stress):
"I'm sorry to hear that you're feeling sad today. It's okay to have those feelings, and it's important to acknowledge them. • Sometimes writing down your thoughts can help clarify what's on your mind • Music or drawing can be a soothing way to express feelings • If there's something specific weighing on you, talking it through might help lighten the load • Remember it's okay to seek comfort in small things you enjoy. Is there anything in particular that's been bothering you today?"

Return ONLY valid JSON:
{
  "reply": "full caring message — same depth in English or Chinese",
  "summary": "one English sentence for staff",
  "riskLevel": "low | medium | high",
  "crisisDetected": false,
  "syncNote": "",
  "escalationNeeded": false,
  "escalationResources": []
}

SAFETY RISK ASSESSMENT (required every reply — semantic understanding, NOT keyword matching):
- Read the FULL latest message for emotional intensity, intent, implied meaning, context, and escalation trajectory — including indirect, metaphorical, or coded language (e.g. "I don't want to be here anymore", "nothing matters", "they hurt me", "I can't take it", vague hopelessness).
- Do NOT rely on explicit crisis keywords alone. Assess risk from meaning even when the youth uses casual or understated wording.
- riskLevel:
  • low — ordinary stress, mild sadness, everyday concerns without safety implications
  • medium — significant distress, hopelessness, conflict, bullying, or emotional overwhelm without imminent danger
  • high — self-harm or suicide ideation/intent, abuse, violence, imminent danger, or any crisis-level safety concern
- crisisDetected: true ONLY when riskLevel is "high"
- escalationNeeded: true ONLY when riskLevel is "high" (the app shows 24-hour support resources separately — do NOT paste hotline numbers into "reply")
- escalationResources: always [] (resources are appended by the app UI, not in your reply)
- Keep "reply" calm, supportive, and non-judgmental. Gently encourage reaching immediate support if they may be in danger. Never cold refusal.
- syncNote always ""`

  if (mode === 'mood') {
    prompt += `\n\nMOOD CHECK-IN: respond warmly with the SAME depth as a normal chat reply — NOT a one-line generic invitation.
- Include 3–4 practical suggestions as bullet lines starting with "•"
- English Sad/Stressed/Overwhelmed replies: 100+ words with reflection + bullets + gentle questions
- Match the caring bullet style in the MOOD examples above`
  }
  if (mode === 'greeting') {
    prompt += `\n\nGREETING: welcome ${ctx.preferredName} for after-hours support. Warm, brief, invite them to share what is on their mind tonight.`
  }

  return prompt
}

function buildFallbackMorningBrief() {
  return {
    overnight_summary: '',
    suggested_opening_lines: [],
    follow_up_priority: 'routine',
  }
}

function normalizeMorningBrief(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback
  const brief = raw as Record<string, unknown>
  const lines = Array.isArray(brief.suggested_opening_lines)
    ? brief.suggested_opening_lines.filter(Boolean).map(String).slice(0, 3)
    : fallback.suggested_opening_lines
  return {
    overnight_summary: pickText(String(brief.overnight_summary || ''), fallback.overnight_summary),
    suggested_opening_lines: lines.length ? lines : fallback.suggested_opening_lines,
    follow_up_priority: ['routine', 'soon', 'urgent'].includes(String(brief.follow_up_priority))
      ? String(brief.follow_up_priority)
      : fallback.follow_up_priority,
  }
}

async function fetchChatContext(client, youthId: string, preferredName: string): Promise<ChatContext> {
  let staffName: string | null = null
  let lastOfflineSummary: string | null = null
  let recentAiSummary: string | null = null
  let latestChange: string | null = null

  try {
    const { data: youth } = await client.database
      .from('youth_profiles')
      .select('assigned_staff_id')
      .eq('id', youthId)
      .maybeSingle()

    if (youth?.assigned_staff_id) {
      const { data: staff } = await client.database
        .from('profiles')
        .select('display_name')
        .eq('id', youth.assigned_staff_id)
        .maybeSingle()
      staffName = staff?.display_name || null
    }
  } catch (error) {
    console.error('[youth-ai-chat] staff context skipped:', error.message)
  }

  try {
    const { data: aiSessions } = await client.database
      .from('ai_chat_sessions')
      .select('session_date, ai_summary, mood_check_in')
      .eq('youth_id', youthId)
      .order('session_date', { ascending: false })
      .limit(4)

    const today = new Date().toISOString().slice(0, 10)
    const recentAiParts = (aiSessions || [])
      .filter((s) => s.session_date !== today && (s.ai_summary || s.mood_check_in))
      .slice(0, 2)
      .map((s) => {
        if (s.ai_summary) return `${s.session_date}: ${s.ai_summary}`
        return `${s.session_date}: mood ${s.mood_check_in}`
      })
    recentAiSummary = recentAiParts.length ? recentAiParts.join(' | ') : null
  } catch (error) {
    console.error('[youth-ai-chat] ai session context skipped:', error.message)
  }

  return {
    preferredName,
    staffName,
    lastOfflineSummary,
    recentAiSummary,
    latestChange,
  }
}

async function callChatGptWithTimeout(messages, label = 'chat', timeoutMs = 25000) {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
  })
  return Promise.race([callChatGpt(messages, label), timeout])
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getClient(req) {
  const authHeader = req.headers.get('Authorization')
  const userToken = authHeader ? authHeader.replace('Bearer ', '') : null
  return createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    edgeFunctionToken: userToken,
  })
}

/** Project API key — bypasses RLS for writes after handler auth checks. */
function getServiceClient() {
  return createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    anonKey: Deno.env.get('API_KEY') || Deno.env.get('ANON_KEY'),
  })
}

function uniqueTags(...arrays: unknown[][]) {
  const seen = new Set<string>()
  const out: string[] = []
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
  return out.slice(0, 16)
}

function pickArray(next, previous) {
  const cleaned = (next || []).filter(Boolean).map(String).map((s) => s.trim()).filter(Boolean)
  if (!cleaned.length) return previous || []
  return cleaned
}

function pickText(next, previous, fallback = '') {
  const trimmed = (next || '').trim()
  if (trimmed) return trimmed
  if ((previous || '').trim()) return previous.trim()
  return fallback
}

function youthLines(messages) {
  return (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter(Boolean)
}

const MOOD_CHECKIN_LINE = /^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i

const CRISIS_TEXT_RE = /想自杀|自杀|不想活|自伤|suicide|kill myself|hurt myself|want to die|self.?harm/i
const HIGH_RISK_TEXT_RE = /霸凌|bully|扔东西|欺负|跟踪|跟着我|stalk|盯着我|hitting|hit me|abuse|打/i
const MEDIUM_RISK_TEXT_RE = /吵架|压力|难过|sad|stress|stressed|崩溃|overwhelm|anxious|受不了|撑不住/i

function inferRiskFromText(text = '') {
  const value = String(text || '')
  if (CRISIS_TEXT_RE.test(value)) return 'high'
  if (HIGH_RISK_TEXT_RE.test(value)) return 'high'
  if (MEDIUM_RISK_TEXT_RE.test(value)) return 'medium'
  return 'low'
}

function inferRiskFromMessage(message = '') {
  return inferRiskFromText(message)
}

function inferRiskFromTranscript(messages = []) {
  const youthText = (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter((line) => line && !MOOD_CHECKIN_LINE.test(line))
    .join(' ')
  return inferRiskFromText(youthText)
}

function normalizeYouthCasualText(message = '') {
  return String(message || '')
    .trim()
    .replace(/^ilike\b/i, 'i like')
    .replace(/^ilove\b/i, 'i love')
    .replace(/^ienjoy\b/i, 'i enjoy')
}

function isCasualPositiveMessage(message = '') {
  const raw = String(message || '').trim()
  if (!raw || raw.length > 120) return false
  if (MOOD_CHECKIN_LINE.test(raw)) return false
  if (
    /想自杀|自杀|自伤|hurt myself|suicide|kill myself|abuse|bully|hit me|打|骂|欺负|only .+ make(s)? me feel/i.test(
      raw,
    )
  ) {
    return false
  }
  const text = normalizeYouthCasualText(raw)
  return (
    /\b(i'?m\s+)?(really\s+)?(into|like|love|enjoy|prefer)\b/i.test(text) ||
    /^我很喜欢|我喜欢|我超喜欢|我爱/.test(raw)
  )
}

function inferRiskForChatTurn(messages = [], latestMessage = '') {
  const latest = String(latestMessage || '').trim()
  if (isCasualPositiveMessage(latest)) return 'low'
  return pickHigherRisk(inferRiskFromText(latest), inferRiskFromTranscript(messages))
}

function buildDynamicProfileFromYouthText() {
  return {
    interests: [],
    personality: [],
    preferred_communication_style: [],
    living_arrangement: '',
    current_challenges: [],
    coping_methods: [],
  }
}

function buildDynamicProfileRuleFallback(context: ReturnType<typeof collectDynamicProfileContext>) {
  const corpus = [context.youthSpeech, context.offlineTranscripts, ...(context.sessionSummaries || [])]
    .filter(Boolean)
    .join('\n')
  const questionnaire = context.staticProfile
  const staticInterests = asProfileArray(questionnaire?.interests)

  if (!corpus.trim() && !(context.moodHistory || []).length) {
    return profileDynamicFieldsForDisplay(buildDynamicProfileFromYouthText())
  }

  const personality: string[] = []
  const coping_methods: string[] = []
  const interests: string[] = []
  let living_arrangement = ''

  const pushUnique = (target: string[], items: string[], limit = 4) => {
    const seen = new Set(target.map((item) => item.toLowerCase()))
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
    (context.moodHistory || []).some((m) => /sad|stressed|overwhelmed/i.test(String(m)))
  ) {
    pushUnique(personality, ['Carrying low mood', 'May appear withdrawn when overwhelmed'])
  }
  if (
    /family|parent|home|爸妈|父母|吵架|conflict/i.test(corpus) ||
    asProfileArray(questionnaire?.current_challenges).some((c) => /family/i.test(c))
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

  return profileDynamicFieldsForDisplay({
    interests,
    personality,
    living_arrangement,
    coping_methods,
  })
}

function themePhrase(text) {
  const themes: string[] = []
  if (/cure myself|hurt myself|self.?harm|suicide/i.test(text)) themes.push('safety concerns')
  if (/难过|sad/i.test(text)) themes.push('sadness')
  if (/压力|学业|exam|stress/i.test(text)) themes.push('academic pressure')
  if (/温柔|gentle|陪伴/i.test(text)) themes.push('a need for gentle support')
  return themes.length ? themes.join(' and ') : 'how they have been feeling'
}

function buildCumulativeSummary(name, messages) {
  const lines = youthLines(messages).filter((line) => !MOOD_CHECKIN_LINE.test(line))
  if (!lines.length) {
    return `${name} has started using the after-hours AI companion. A fuller picture will build as they continue to share.`
  }

  const earlyText = lines.slice(0, 2).join(' ')
  const recentText = lines.slice(-2).join(' ')
  const risk = inferRiskFromTranscript(messages) || 'low'
  const earlyTheme = themePhrase(earlyText)
  const recentTheme = themePhrase(recentText)

  let paragraph = `${name} has been engaging with the after-hours AI companion over time. `
  paragraph += `Earlier on, their conversations often centered on ${earlyTheme}. `
  if (recentTheme !== earlyTheme || lines.length > 2) {
    paragraph += `More recently, their focus has shifted toward ${recentTheme}. `
  }
  if (risk === 'high') {
    paragraph += `The presentation has worsened recently and staff should treat this as elevated risk requiring timely follow-up. `
  } else if (risk === 'medium') {
    paragraph += `Stress remains noticeable and consistent support would be helpful. `
  }
  paragraph += `This cumulative summary is meant to help any staff member taking over the case understand this youth's journey so far.`
  return paragraph
}

function uniqueConcrete(...arrays: string[][]) {
  return uniqueTags(...arrays).slice(0, 6)
}

function clampSnapshotWords(text: string) {
  return String(text || '').trim()
}

function isCaseSnapshotQuality(text: string) {
  return Boolean(String(text || '').trim())
}

function mergeCaseSnapshotIncrementalTS(previous = '', update = '') {
  return pickText(update, previous)
}

function buildCaseSnapshotTS() {
  return ''
}

function buildLivingCaseStoryTS() {
  return ''
}

function buildFallbackInsights() {
  return {
    current_state: [],
    risk_level: 'low',
    main_risk: [],
    best_communication_approach: [],
    latest_change: '',
    overall_summary: '',
    dynamic_profile: buildDynamicProfileFromYouthText(),
    morning_brief: buildFallbackMorningBrief(),
  }
}

function asProfileArray(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function joinNatural(items: string[], fallback = 'ongoing stress') {
  const cleaned = items.filter(Boolean).map(String)
  if (!cleaned.length) return fallback
  if (cleaned.length === 1) return cleaned[0]
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`
}

function themesFromText(text: string) {
  const themes: string[] = []
  if (/sleep|失眠|睡不着/i.test(text)) themes.push('sleep difficulties')
  if (/exam|考试|学业|study|homework/i.test(text)) themes.push('academic pressure')
  if (/爸妈|父母|吵架|family|argu/i.test(text)) themes.push('family tension')
  if (/崩溃|overwhelmed|受不了/i.test(text)) themes.push('emotional overwhelm')
  if (/霸凌|欺负|bully/i.test(text)) themes.push('bullying or peer mistreatment')
  if (/跟踪|stalk|跟着我/i.test(text)) themes.push('safety concerns')
  if (/难过|sad|lonely|孤独/i.test(text)) themes.push('sadness or loneliness')
  return themes
}

function approvedOfflineSessions(sessions: Array<Record<string, unknown>> = []) {
  return [...sessions]
    .filter((s) => s.status !== 'draft')
    .sort(
      (a, b) =>
        new Date(String(a.session_date || 0)).getTime() - new Date(String(b.session_date || 0)).getTime(),
    )
}

// Locked: src/lib/atAGlancePrompt.js (carebridge-at-a-glance-generation-system-final)
const AT_A_GLANCE_PROMPT = `Generate overall_summary as the At a Glance section. Follow CareBridge AI - At a Glance Generation System exactly.

## Purpose

At a Glance provides a concise and continuously evolving overview of the youth.

It should help a youth worker quickly understand:
- Who this young person is
- What they have been going through
- What ongoing circumstances appear to affect them
- What emotional or behavioural patterns have emerged over time
- What currently appears to have the greatest impact on their wellbeing

At a Glance should read like a professional case overview rather than a conversation summary or questionnaire summary.

It should feel as though an experienced youth worker has written a short observational paragraph after understanding the youth over time.

## Information Sources

At a Glance should synthesise information from (context payload fields in parentheses):
- AI Conversations (youthSpeechSample)
- Offline Counselling Transcripts (offlineTranscriptSample)
- Mood Check-ins (moodHistory)
- Existing At a Glance (existingOverallSummary — for understanding only, never copy wording)
- Existing Current Care Insights (careInsights)
- Existing Session Summaries (sessionSummaries)
- Existing Dynamic Profile (dynamicProfile)
- Any stored case information in the payload

These sources form the PRIMARY basis of At a Glance because they contain context, experiences and behavioural patterns.

Fairly review and integrate ALL sources. Do NOT prioritise any single stage, source, or time period. Apply one fair whole-case check-and-integration pass.

## Questionnaire Usage

The Youth Questionnaire (questionnaireBackground) should NOT be treated as a primary information source.

Questionnaire responses are isolated self-reported labels and often lack context or causal relationships.

NEVER generate At a Glance by simply combining questionnaire fields such as Interests, Personality, Family Situation, Current Challenges, or Coping Methods into one paragraph.

Questionnaire information is OPTIONAL background only. Reference it ONLY IF:
- it has been reinforced by subsequent interactions
- it helps explain recurring behavioural patterns
- it provides meaningful background context for understanding the youth's overall situation

Questionnaire information must NEVER dominate the paragraph.

If meaningful contextual relationships cannot be reasonably established, integrate available facts into a smooth and natural paragraph.

Acceptable factual overview example: "The youth enjoys music, tends to be introverted, lives with one parent and is currently experiencing academic stress."

NEVER invent unsupported causal relationships, such as assuming that living with one parent caused academic stress or emotional difficulties, unless such relationships are reasonably supported by accumulated interactions or explicit statements from the youth.

When uncertainty exists, factual description is always preferred over speculation.

## Writing Philosophy

At a Glance should describe the youth's STORY rather than the youth's LABELS.

Synthesise information instead of listing facts.

Whenever possible, naturally connect experiences, emotions, behaviours, coping patterns, and life circumstances into one coherent understanding.

The paragraph should maintain strong logical continuity and read as one natural case portrait rather than multiple disconnected observations.

## Causal Relationships

Prioritise meaningful relationships between events, emotions and behaviours whenever sufficient evidence exists.

If available information reasonably suggests that one experience appears to influence another, describe this relationship cautiously.

NEVER invent or assume causal relationships that are not supported by available information.

If causal relationships cannot be reasonably inferred, describe observed facts together naturally without speculating about how they are connected.

Describing facts is always preferable to inventing explanations.

## Update Trigger

Whenever ANY information source changes, At a Glance should be completely regenerated.

Do NOT append sentences. Do NOT preserve previous wording.

Always regenerate the paragraph using the AI's latest understanding of the youth.

The newest version should replace the previous version entirely.

This applies equally to Assigned Youth and Unassigned Youth. Both should always display the AI's latest overall understanding.

New AI chat, new transcript upload, or questionnaire update triggers full regeneration — this does NOT mean prioritising any stage; fairly go through the whole check-and-integration process.

## Writing Style

The paragraph should:
- be written as one coherent paragraph
- maintain overall continuity and logical flow
- be professional but human-centred
- be neutral and observational
- avoid diagnosis
- avoid exaggerated conclusions
- avoid repetitive wording
- avoid sounding like AI-generated text
- avoid sounding like a report template

There is no strict word limit. While ensuring all meaningful characteristics are represented, keep the paragraph as concise as possible. Every sentence should contribute meaningful understanding.

## Avoid

Do NOT write chronological summaries, conversation summaries, transcript summaries, questionnaire summaries, bullet points, or label lists.

Do NOT use: "The youth discussed...", "The latest AI chat...", "The latest counselling session...", "Recently...", "According to the questionnaire..."

Do not mention where the information came from. Integrate all accumulated understanding naturally.

## Continuous Evolution

At a Glance is a living case portrait.

Whenever the AI's understanding of long-term circumstances, recurring emotional patterns, behavioural tendencies, meaningful life events, important coping styles, ongoing challenges, or overall wellbeing changes, the entire At a Glance paragraph should be regenerated.

The latest version should always represent the AI's best current understanding of the youth.

## Final Principle

At a Glance should answer: "If a new youth worker takes over this case today and only has 20 seconds to read one paragraph, what is the most meaningful understanding they should gain about this young person?"

Always prioritise: understanding over extraction, synthesis over summarisation, coherent narrative over isolated labels, evidence over speculation, and factual description over unsupported causal inference.

${STAFF_EDITED_SOURCES_RULE}

Return ONLY valid JSON: { "overall_summary": "one paragraph" }`

const BANNED_LATEST_CHANGE_PATTERNS = [
  /\bthe youth discussed\b/i,
  /\bthe youth shared\b/i,
  /\bthe youth reported\b/i,
  /\bduring this session\b/i,
  /\bin the latest ai chat\b/i,
  /\bin the latest counselling session\b/i,
  /\bin the latest session\b/i,
  /\bthe conversation focused on\b/i,
]

const BANNED_AT_A_GLANCE_PATTERNS = [
  /\bthe latest session\b/i,
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
  /\bthe latest ai chat\b/i,
  /\bthe latest counselling session\b/i,
  /\brecently\b/i,
  /\baccording to\b/i,
]

function atAGlanceWordCount(text: string) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function joinNaturalAtAGlance(items: string[], limit = 4) {
  const list = (items || []).filter(Boolean).map(String)
  if (!list.length) return ''
  const slice = list.slice(0, limit)
  if (slice.length === 1) return slice[0]
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`
  return `${slice.slice(0, -1).join(', ')}, and ${slice[slice.length - 1]}`
}

function normalizeQuestionnaireRow(row: Record<string, unknown> | null | undefined) {
  if (!row) return null
  const asArray = (value: unknown) => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String)
    if (typeof value === 'string' && value.trim()) return [value.trim()]
    return []
  }
  return {
    interests: asArray(row.interests),
    personality: asArray(row.personality),
    preferred_communication_style: asArray(row.preferred_communication_style),
    living_arrangement: String(row.living_arrangement || '').trim(),
    current_challenges: asArray(row.current_challenges),
    coping_methods: asArray(row.coping_methods),
    additional_notes: String(row.additional_notes || '').trim(),
  }
}

function mergeProfileFieldsForAtAGlance(
  questionnaire: Record<string, unknown> | null | undefined,
  dynamicProfile: Record<string, unknown> | null | undefined,
) {
  const q = questionnaire || {}
  const d = dynamicProfile || {}
  return {
    interests: uniqueTags(asProfileArray(q.interests), asProfileArray(d.interests)),
    personality: uniqueTags(asProfileArray(q.personality), asProfileArray(d.personality)),
    preferred_communication_style: uniqueTags(
      asProfileArray(q.preferred_communication_style),
      asProfileArray(d.preferred_communication_style),
    ),
    living_arrangement: pickText(String(d.living_arrangement || ''), String(q.living_arrangement || '')),
    current_challenges: uniqueTags(asProfileArray(q.current_challenges), asProfileArray(d.current_challenges)),
    coping_methods: uniqueTags(asProfileArray(q.coping_methods), asProfileArray(d.coping_methods)),
    additional_notes: String(q.additional_notes || '').trim(),
  }
}

function collectAtAGlanceContext({
  youthName = 'This youth',
  questionnaire = null,
  dynamicProfile = null,
  careInsights = null,
  existingOverallSummary = '',
  messages = [],
  aiSessions = [],
  offlineSessions = [],
}: {
  youthName?: string
  questionnaire?: Record<string, unknown> | null
  dynamicProfile?: Record<string, unknown> | null
  careInsights?: Record<string, unknown> | null
  existingOverallSummary?: string
  messages?: { sender: string; message: string }[]
  aiSessions?: { mood_check_in?: string; ai_summary?: string }[]
  offlineSessions?: Array<{ status?: string; transcript?: string; ai_summary?: string }>
} = {}) {
  const dynamic = profileDynamicFieldsForDisplay(normalizeDynamicProfile(dynamicProfile))
  const questionnaireBackground = questionnaire
    ? {
        interests: asProfileArray(questionnaire.interests),
        personality: asProfileArray(questionnaire.personality),
        preferred_communication_style: asProfileArray(questionnaire.preferred_communication_style),
        living_arrangement: String(questionnaire.living_arrangement || '').trim(),
        current_challenges: asProfileArray(questionnaire.current_challenges),
        coping_methods: asProfileArray(questionnaire.coping_methods),
        additional_notes: String(questionnaire.additional_notes || '').trim(),
      }
    : null

  const youthSpeech = youthLines(messages)
    .filter((line) => !MOOD_CHECKIN_LINE.test(line))
    .join('\n')
  const offline = approvedOfflineSessions(offlineSessions as Array<Record<string, unknown>>)
  const sessionSummaries = [
    ...(aiSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...offline.map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]
  const offlineTranscriptSample = offline
    .map((s) => youthTranscriptLines(String(s.transcript || '')).join('\n'))
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)

  const primaryCorpus = [youthSpeech, ...sessionSummaries, offlineTranscriptSample].filter(Boolean).join('\n')
  const moods = (aiSessions || []).map((s) => s.mood_check_in).filter(Boolean).map(String)
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
    moodHistory: moods,
    recentMood: (aiSessions || []).find((s) => s.mood_check_in)?.mood_check_in || null,
    youthSpeech,
    sessionSummaries,
    offlineTranscriptSample,
    primaryCorpus,
    corpus: primaryCorpus,
    profile: dynamic,
  }
}

function buildAtAGlanceAiPayload(context: ReturnType<typeof collectAtAGlanceContext>) {
  return {
    youthName: context.youthName,
    youthSpeechSample: context.youthSpeech.slice(0, 5000),
    sessionSummaries: context.sessionSummaries.slice(0, 8),
    offlineTranscriptSample: context.offlineTranscriptSample,
    moodHistory: context.moodHistory,
    recentMood: context.recentMood,
    dynamicProfile: context.dynamicProfile,
    careInsights: context.careInsights,
    existingOverallSummary: context.existingOverallSummary,
    questionnaireBackground: context.questionnaireBackground,
  }
}

function isAtAGlanceQuality(text: string) {
  const value = String(text || '').trim()
  if (!value) return false
  if (/[\u4e00-\u9fff]/.test(value)) return false
  const words = atAGlanceWordCount(value)
  if (words < 40 || words > 280) return false
  if (BANNED_AT_A_GLANCE_PATTERNS.some((p) => p.test(value))) return false
  return true
}

function clampAtAGlanceWords(text: string, max = 220) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= max) return words.join(' ')
  return `${words.slice(0, max).join(' ').replace(/[,;]$/, '')}.`
}

function detectPortraitThemes(corpus: string) {
  const themes: string[] = []
  if (/exam|academic|study|grade|school|homework/i.test(corpus)) themes.push('academic pressure')
  if (/sleep|insomnia|can't sleep|睡不着|失眠/i.test(corpus)) themes.push('sleep disruption')
  if (/family|parent|home|mom|dad|吵架|argu/i.test(corpus)) themes.push('family tension')
  if (/lonely|alone|isolated|withdraw|solitude/i.test(corpus)) themes.push('social withdrawal')
  if (/body image|weight|eating|meal|food/i.test(corpus)) themes.push('body image concerns')
  if (/bird|leaf|headphone|aquarium|nature|counting|collect/i.test(corpus)) {
    themes.push('sensory self-regulation through quiet solitary activities')
  }
  if (/guitar|piano|music|draw|art|game|minecraft/i.test(corpus)) themes.push('creative or immersive coping')
  if (/bully|peer|classmate/i.test(corpus)) themes.push('peer difficulties')
  if (/stress|overwhelm|anxious|worry|sad|low mood/i.test(corpus)) themes.push('emotional strain')
  return themes
}

function buildAtAGlanceFallback(context: ReturnType<typeof collectAtAGlanceContext>) {
  const name = context.youthName || 'This youth'
  const { dynamicProfile, questionnaireBackground, primaryCorpus, moodHistory: moods, recentMood } = context
  const hasPrimary = Boolean(primaryCorpus.trim())
  const q = questionnaireBackground || { interests: [], personality: [], current_challenges: [], living_arrangement: '' }
  const themes = detectPortraitThemes(primaryCorpus)

  if (!hasPrimary && !q.interests?.length && !q.current_challenges?.length && !dynamicProfile.interests?.length) {
    return ''
  }

  const sentences: string[] = []

  if (hasPrimary) {
    let opening = `${name} presents as a young person`
    if (dynamicProfile.personality?.length) {
      opening += ` who often appears ${joinNaturalAtAGlance(dynamicProfile.personality, 2).toLowerCase()}`
    } else if (recentMood && /sad|stressed|overwhelmed/i.test(String(recentMood))) {
      opening += ' carrying a subdued and emotionally weighted presentation'
    } else {
      opening += ' navigating ongoing emotional strain alongside everyday pressures'
    }
    opening += '.'
    sentences.push(opening)

    if (themes.length) {
      sentences.push(
        `Across contacts, ${joinNaturalAtAGlance(themes, 3).toLowerCase()} have shaped how they manage mood, concentration and daily routines.`,
      )
    }

    const restorative = joinNaturalAtAGlance(
      [...(dynamicProfile.coping_methods || []), ...(dynamicProfile.interests || [])],
      3,
    )
    if (restorative) {
      sentences.push(
        `They tend to restore calm through ${restorative.toLowerCase()}, suggesting private low-stimulation rituals remain important anchors when distress rises.`,
      )
    }

    if (dynamicProfile.living_arrangement) {
      sentences.push(`Home context (${dynamicProfile.living_arrangement.toLowerCase()}) forms part of the backdrop to their current stress.`)
    } else if (/family|parent|home/i.test(primaryCorpus)) {
      sentences.push('Family dynamics appear to weigh on mood alongside school and social expectations.')
    }

    if (moods.length) {
      const lowMoods = moods.filter((m) => /sad|stressed|overwhelmed/i.test(String(m)))
      if (lowMoods.length >= Math.ceil(moods.length / 2)) {
        sentences.push('Sadness or overwhelm has been the factor most visibly affecting day-to-day wellbeing recently.')
      }
    } else if (themes[0]) {
      sentences.push(`At present, ${themes[0]} appears to exert the greatest influence on how manageable life feels.`)
    }
  } else if (q.interests?.length || q.personality?.length || q.current_challenges?.length) {
    const parts: string[] = []
    if (q.interests?.length) parts.push(`enjoys ${joinNaturalAtAGlance(q.interests, 2).toLowerCase()}`)
    if (q.personality?.length) parts.push(`tends to be ${joinNaturalAtAGlance(q.personality, 2).toLowerCase()}`)
    if (q.living_arrangement) parts.push(`lives ${q.living_arrangement.toLowerCase()}`)
    if (q.current_challenges?.length) parts.push(`is currently experiencing ${joinNaturalAtAGlance(q.current_challenges, 2).toLowerCase()}`)
    sentences.push(
      `${name} ${parts.join(', ')}. This factual overview is based on limited contact so far; a fuller portrait will develop as interactions accumulate.`,
    )
  }

  return clampAtAGlanceWords(sentences.join(' '))
}

function regenerateAtAGlance({ aiGenerated = '', context }: { aiGenerated?: string; context: ReturnType<typeof collectAtAGlanceContext> }) {
  const ai = String(aiGenerated || '').trim()
  if (hasLockedAtAGlanceQuality(ai)) return clampAtAGlanceWords(ai)
  return buildAtAGlanceFallback(context)
}

async function generateAtAGlance(
  preferredName: string,
  {
    questionnaire = null,
    dynamicProfile = null,
    careInsights = null,
    existingOverallSummary = '',
    messages = [],
    aiSessions = [],
    offlineSessions = [],
  }: {
    questionnaire?: Record<string, unknown> | null
    dynamicProfile?: Record<string, unknown> | null
    careInsights?: Record<string, unknown> | null
    existingOverallSummary?: string
    messages?: { sender: string; message: string }[]
    aiSessions?: { mood_check_in?: string; ai_summary?: string }[]
    offlineSessions?: Array<{ status?: string; transcript?: string; ai_summary?: string }>
  },
) {
  const context = collectAtAGlanceContext({
    youthName: preferredName,
    questionnaire,
    dynamicProfile,
    careInsights,
    existingOverallSummary,
    messages,
    aiSessions,
    offlineSessions,
  })

  const q = context.questionnaireBackground
  if (
    !context.primaryCorpus.trim() &&
    !context.dynamicProfile.interests?.length &&
    !(q?.interests?.length) &&
    !(q?.current_challenges?.length)
  ) {
    return ''
  }

  try {
    const insightMessages = [
      { role: 'system', content: AT_A_GLANCE_PROMPT },
      { role: 'user', content: JSON.stringify(buildAtAGlanceAiPayload(context)) },
    ]
    const aiResult = await callChatGpt(insightMessages, 'at-a-glance')
    const aiSummary = String((aiResult.parsed as Record<string, unknown>)?.overall_summary || '').trim()
    if (hasLockedAtAGlanceQuality(aiSummary)) {
      console.log('[youth-ai-chat] at-a-glance AI model:', aiResult.model)
      return clampAtAGlanceWords(aiSummary)
    }
  } catch (aiError) {
    console.error('[youth-ai-chat] at-a-glance AI failed, using fallback:', (aiError as Error).message)
  }

  if (!context.primaryCorpus.trim()) {
    return buildAtAGlanceFallback(context)
  }
  return ''
}

function staticProfileFromQuestionnaire(questionnaire: Record<string, unknown> | null | undefined) {
  if (!questionnaire) return null
  return {
    interests: asProfileArray(questionnaire.interests),
    personality: asProfileArray(questionnaire.personality),
    preferred_communication_style: asProfileArray(questionnaire.preferred_communication_style),
    living_arrangement: String(questionnaire.living_arrangement || '').trim(),
    current_challenges: asProfileArray(questionnaire.current_challenges),
    coping_methods: asProfileArray(questionnaire.coping_methods),
  }
}

function youthTranscriptLines(transcript: string) {
  const lines: string[] = []
  for (const raw of String(transcript || '').split(/\n/)) {
    const line = raw.trim()
    if (!line) continue
    const tagged = line.match(/^(?:Youth|YOUTH|Client|Student)\s*[:\-]\s*(.+)$/i)
    if (tagged) lines.push(tagged[1].trim())
  }
  return lines
}

function normalizeDynamicProfile(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== 'object') return buildDynamicProfileFromYouthText()
  return {
    interests: asProfileArray(raw.interests),
    personality: asProfileArray(raw.personality),
    preferred_communication_style: asProfileArray(raw.preferred_communication_style),
    living_arrangement: pickText(String(raw.living_arrangement || ''), ''),
    current_challenges: asProfileArray(raw.current_challenges),
    coping_methods: asProfileArray(raw.coping_methods),
  }
}

function profileDynamicFieldsForDisplay(profile: Record<string, unknown> | null | undefined) {
  const normalized = normalizeDynamicProfile(profile)
  return {
    interests: normalized.interests,
    personality: normalized.personality,
    living_arrangement: normalized.living_arrangement,
    coping_methods: normalized.coping_methods,
  }
}

function hasDynamicProfileData(profile: Record<string, unknown> | null | undefined) {
  const normalized = profileDynamicFieldsForDisplay(profile)
  return Boolean(
    normalized.interests.length ||
      normalized.personality.length ||
      normalized.living_arrangement ||
      normalized.coping_methods.length,
  )
}

function exactDuplicateOfStatic(label: string, staticList: string[]) {
  const value = String(label || '').trim().toLowerCase()
  if (!value) return true
  return (staticList || []).some((item) => String(item).trim().toLowerCase() === value)
}

function dedupeDynamicAgainstStatic(
  dynamicProfile: Record<string, unknown>,
  questionnaire: Record<string, unknown> | null | undefined,
) {
  const dynamic = profileDynamicFieldsForDisplay(dynamicProfile)
  const staticP = staticProfileFromQuestionnaire(questionnaire)
  if (!staticP) return dynamic

  let living = dynamic.living_arrangement
  if (
    living &&
    staticP.living_arrangement &&
    living.toLowerCase() === staticP.living_arrangement.toLowerCase()
  ) {
    living = ''
  }

  return {
    interests: dynamic.interests.filter((item) => !exactDuplicateOfStatic(item, staticP.interests)),
    personality: dynamic.personality.filter((item) => !exactDuplicateOfStatic(item, staticP.personality)),
    living_arrangement: living,
    coping_methods: dynamic.coping_methods.filter((item) => !exactDuplicateOfStatic(item, staticP.coping_methods)),
  }
}

function regenerateDynamicProfile({
  aiGenerated = null,
  questionnaire = null,
}: {
  aiGenerated?: Record<string, unknown> | null
  questionnaire?: Record<string, unknown> | null
}) {
  const normalized = profileDynamicFieldsForDisplay(normalizeDynamicProfile(aiGenerated))
  return dedupeDynamicAgainstStatic(normalized, questionnaire)
}

function collectDynamicProfileContext({
  questionnaire = null,
  existingDynamic = null,
  messages = [],
  aiSessions = [],
  offlineSessions = [],
  overallSummary = '',
  careInsights = null,
}: {
  questionnaire?: Record<string, unknown> | null
  existingDynamic?: Record<string, unknown> | null
  messages?: { sender: string; message: string }[]
  aiSessions?: { mood_check_in?: string; ai_summary?: string }[]
  offlineSessions?: Array<{ status?: string; transcript?: string; ai_summary?: string }>
  overallSummary?: string
  careInsights?: Record<string, unknown> | null
} = {}) {
  const youthSpeech = youthLines(messages)
    .filter((line) => !MOOD_CHECKIN_LINE.test(line))
    .join('\n')
  const offline = approvedOfflineSessions(offlineSessions as Array<Record<string, unknown>>)
  const sessionSummaries = [
    ...(aiSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...offline.map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]
  const offlineTranscripts = offline
    .map((s) => youthTranscriptLines(String(s.transcript || '')).join('\n'))
    .filter(Boolean)
    .join('\n')
  const moods = (aiSessions || []).map((s) => s.mood_check_in).filter(Boolean).map(String)

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

function hasDynamicProfileSignal(context: ReturnType<typeof collectDynamicProfileContext>) {
  return Boolean(
    context.youthSpeech ||
      context.sessionSummaries.length ||
      context.offlineTranscripts ||
      hasDynamicProfileData(context.existingDynamicProfile as Record<string, unknown>),
  )
}

async function generateDynamicProfile(
  preferredName: string,
  {
    questionnaire = null,
    existingDynamic = null,
    messages = [],
    aiSessions = [],
    offlineSessions = [],
    overallSummary = '',
    careInsights = null,
  }: {
    questionnaire?: Record<string, unknown> | null
    existingDynamic?: Record<string, unknown> | null
    messages?: { sender: string; message: string }[]
    aiSessions?: { mood_check_in?: string; ai_summary?: string }[]
    offlineSessions?: Array<{ status?: string; transcript?: string; ai_summary?: string }>
    overallSummary?: string
    careInsights?: Record<string, unknown> | null
  },
) {
  const context = collectDynamicProfileContext({
    questionnaire,
    existingDynamic,
    messages,
    aiSessions,
    offlineSessions,
    overallSummary,
    careInsights,
  })

  if (!hasDynamicProfileSignal(context)) {
    return profileDynamicFieldsForDisplay(existingDynamic)
  }

  try {
    const insightMessages = [
      { role: 'system', content: DYNAMIC_PROFILE_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          youthName: preferredName,
          ...context,
          youthSpeechSample: context.youthSpeech.slice(0, 4000),
          offlineTranscriptsSample: context.offlineTranscripts.slice(0, 4000),
        }),
      },
    ]
    const aiResult = await callChatGpt(insightMessages, 'dynamic-profile')
    const raw = (aiResult.parsed as Record<string, unknown>)?.dynamic_profile as Record<string, unknown> | undefined
    const regenerated = regenerateDynamicProfile({ aiGenerated: raw, questionnaire })
    if (hasDynamicProfileData(regenerated)) {
      console.log('[youth-ai-chat] dynamic-profile AI model:', aiResult.model)
      return regenerated
    }
  } catch (aiError) {
    console.error('[youth-ai-chat] dynamic-profile AI failed, keeping existing:', (aiError as Error).message)
  }

  const fallback = buildDynamicProfileRuleFallback(context)
  if (hasDynamicProfileData(fallback)) {
    console.log('[youth-ai-chat] using rule-based dynamic-profile fallback')
    return fallback
  }

  return profileDynamicFieldsForDisplay(existingDynamic)
}

function normalizeCareInsights(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== 'object') {
    return { current_state: [], main_risk: [], best_communication_approach: [], latest_change: '' }
  }
  return {
    current_state: uniqueTags(asProfileArray(raw.current_state)).slice(0, 3),
    main_risk: uniqueTags(asProfileArray(raw.main_risk)).slice(0, 3),
    best_communication_approach: uniqueTags(asProfileArray(raw.best_communication_approach)).slice(0, 5),
    latest_change: pickText(String(raw.latest_change || ''), ''),
  }
}

function isLatestChangeQuality(text: string) {
  const value = String(text || '').trim()
  if (!value) return false
  return !BANNED_LATEST_CHANGE_PATTERNS.some((p) => p.test(value))
}

function isCareInsightsQuality(insights: Record<string, unknown> | null | undefined) {
  const normalized = normalizeCareInsights(insights)
  return Boolean(
    normalized.current_state.length ||
      normalized.main_risk.length ||
      normalized.best_communication_approach.length ||
      isLatestChangeQuality(normalized.latest_change),
  )
}

function parseAtTimestamp(value: unknown) {
  if (!value) return 0
  const ts = new Date(String(value)).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function resolveLatestInteraction({
  messages = [],
  aiSessions = [],
  offlineSessions = [],
}: {
  messages?: Array<{ sender: string; message: string; created_at?: string }>
  aiSessions?: Array<{ session_date?: string; mood_check_in?: string; ai_summary?: string }>
  offlineSessions?: Array<{ session_date?: string; updated_at?: string; approved_at?: string; ai_summary?: string; transcript?: string }>
}) {
  const candidates: Array<Record<string, unknown>> = []

  const youthMsgs = (messages || []).filter((m) => m.sender === 'youth')
  if (youthMsgs.length) {
    const last = youthMsgs[youthMsgs.length - 1]
    const speech = String(last.message || '').trim()
    if (speech && !MOOD_CHECKIN_LINE.test(speech)) {
      candidates.push({ type: 'ai_conversation', at: last.created_at || null, youthSpeech: speech, summary: '' })
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

  for (const session of approvedOfflineSessions(offlineSessions as Array<Record<string, unknown>>)) {
    if (session.ai_summary || session.transcript) {
      candidates.push({
        type: 'offline_counselling',
        at: session.session_date || session.updated_at || session.approved_at || null,
        summary: String(session.ai_summary || '').trim(),
        transcriptSample: String(session.transcript || '').slice(0, 2000),
      })
    }
  }

  candidates.sort((a, b) => parseAtTimestamp(b.at) - parseAtTimestamp(a.at))
  return candidates[0] || null
}

function collectCareInsightsContext({
  youthName = 'This youth',
  questionnaire = null,
  dynamicProfile = null,
  overallSummary = '',
  existingCareInsights = null,
  messages = [],
  aiSessions = [],
  offlineSessions = [],
  latestExchangeSummary = '',
}: {
  youthName?: string
  questionnaire?: Record<string, unknown> | null
  dynamicProfile?: Record<string, unknown> | null
  existingCareInsights?: Record<string, unknown> | null
  messages?: { sender: string; message: string; created_at?: string }[]
  aiSessions?: { session_date?: string; mood_check_in?: string; ai_summary?: string }[]
  offlineSessions?: Array<{ status?: string; session_date?: string; transcript?: string; ai_summary?: string }>
  overallSummary?: string
  latestExchangeSummary?: string
} = {}) {
  const youthSpeech = youthLines(messages)
    .filter((line) => !MOOD_CHECKIN_LINE.test(line))
    .join('\n')
  const offline = approvedOfflineSessions(offlineSessions as Array<Record<string, unknown>>)
  const sessionSummaries = [
    ...(aiSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...offline.map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]
  const moods = (aiSessions || []).map((s) => s.mood_check_in).filter(Boolean).map(String)

  return {
    youthName: youthName || 'This youth',
    questionnaire,
    dynamicProfile: profileDynamicFieldsForDisplay(dynamicProfile),
    overallSummary: String(overallSummary || '').trim(),
    existingCareInsights: normalizeCareInsights(existingCareInsights),
    youthSpeech,
    sessionSummaries,
    moodHistory: moods,
    latestInteraction: resolveLatestInteraction({ messages, aiSessions, offlineSessions }),
    latestExchangeSummary: String(latestExchangeSummary || '').trim(),
  }
}

function hasCareInsightsSignal(context: ReturnType<typeof collectCareInsightsContext>) {
  return Boolean(
    context.youthSpeech ||
      context.sessionSummaries.length ||
      context.latestInteraction ||
      isCareInsightsQuality(context.existingCareInsights as Record<string, unknown>),
  )
}

function regenerateCareInsights({
  aiGenerated = {},
  saved = {},
  context = null,
}: {
  aiGenerated?: Record<string, unknown>
  saved?: Record<string, unknown>
  context?: Record<string, unknown> | null
}) {
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
        : collectCareInsightsContext(context as Parameters<typeof collectCareInsightsContext>[0])
    const fallback = buildCareInsightsRuleFallback(ctx as ReturnType<typeof collectCareInsightsContext>)
    if (isCareInsightsQuality(fallback)) return fallback
  }
  return savedNorm
}

function buildCareInsightsRuleFallback(context: ReturnType<typeof collectCareInsightsContext>) {
  const youthSpeech = String(context.youthSpeech || '').trim()
  const latest = context.latestInteraction || null
  const latestText = String(
    (latest as { youthSpeech?: string; summary?: string } | null)?.youthSpeech ||
      (latest as { summary?: string } | null)?.summary ||
      context.latestExchangeSummary ||
      '',
  ).trim()
  const corpus = [youthSpeech, latestText].filter(Boolean).join('\n')
  const recentMood = String(
    (latest as { mood?: string } | null)?.mood || (context.moodHistory || [])[0] || '',
  ).trim()
  const questionnaire = (context.questionnaire || {}) as Record<string, unknown>
  const challenges = asProfileArray(questionnaire.current_challenges)

  if (!corpus && !recentMood && !challenges.length) {
    return normalizeCareInsights(null)
  }

  const current_state: string[] = []
  const main_risk: string[] = []
  const best_communication_approach: string[] = []
  let latest_change = ''

  const pushUnique = (target: string[], items: string[], limit = 5) => {
    const seen = new Set(target.map((item) => item.toLowerCase()))
    for (const item of items) {
      const tag = String(item || '').trim()
      const key = tag.toLowerCase()
      if (!tag || seen.has(key)) continue
      seen.add(key)
      target.push(tag)
      if (target.length >= limit) break
    }
  }

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
    const moodLabel = /sad/i.test(`${corpus}${recentMood}`)
      ? 'sad'
      : /stressed/i.test(`${corpus}${recentMood}`)
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
    pushUnique(main_risk, [challenge], 3)
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

  return normalizeCareInsights({ current_state, main_risk, best_communication_approach, latest_change })
}

async function generateCareInsights(
  preferredName: string,
  {
    questionnaire = null,
    dynamicProfile = null,
    existingCareInsights = null,
    messages = [],
    aiSessions = [],
    offlineSessions = [],
    overallSummary = '',
    latestExchangeSummary = '',
  }: {
    questionnaire?: Record<string, unknown> | null
    dynamicProfile?: Record<string, unknown> | null
    existingCareInsights?: Record<string, unknown> | null
    messages?: { sender: string; message: string; created_at?: string }[]
    aiSessions?: { session_date?: string; mood_check_in?: string; ai_summary?: string }[]
    offlineSessions?: Array<{ status?: string; session_date?: string; transcript?: string; ai_summary?: string }>
    overallSummary?: string
    latestExchangeSummary?: string
  },
) {
  const context = collectCareInsightsContext({
    youthName: preferredName,
    questionnaire,
    dynamicProfile,
    overallSummary,
    existingCareInsights,
    messages,
    aiSessions,
    offlineSessions,
    latestExchangeSummary,
  })

  if (!hasCareInsightsSignal(context)) {
    return normalizeCareInsights(existingCareInsights)
  }

  try {
    const insightMessages = [
      { role: 'system', content: CARE_INSIGHTS_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          ...context,
          youthSpeechSample: context.youthSpeech.slice(0, 4000),
        }),
      },
    ]
    const aiResult = await callChatGpt(insightMessages, 'care-insights')
    const raw = aiResult.parsed as Record<string, unknown>
    const regenerated = regenerateCareInsights({
      aiGenerated: {
        current_state: raw?.current_state,
        main_risk: raw?.main_risk,
        best_communication_approach: raw?.best_communication_approach,
        latest_change: raw?.latest_change,
      },
      saved: existingCareInsights || {},
    })
    if (isCareInsightsQuality(regenerated)) {
      console.log('[youth-ai-chat] care-insights AI model:', aiResult.model)
      return regenerated
    }
  } catch (aiError) {
    console.error('[youth-ai-chat] care-insights AI failed, keeping existing:', (aiError as Error).message)
  }

  const fallback = buildCareInsightsRuleFallback(context)
  if (isCareInsightsQuality(fallback)) {
    console.log('[youth-ai-chat] using rule-based care-insights fallback')
    return fallback
  }

  return normalizeCareInsights(existingCareInsights)
}

function mergeDynamicProfile(
  existing: Record<string, unknown> | null | undefined,
  generated: Record<string, unknown> | null | undefined,
  questionnaire: Record<string, unknown> | null | undefined = null,
) {
  const regenerated = regenerateDynamicProfile({ aiGenerated: generated, questionnaire })
  const prev = profileDynamicFieldsForDisplay(existing)
  const next = hasDynamicProfileData(regenerated)
    ? preserveQualityDynamicProfile(prev, regenerated)
    : prev
  return {
    ...buildDynamicProfileFromYouthText(),
    ...next,
    preferred_communication_style: [],
    current_challenges: [],
  }
}

function normalizeCurrentConcern(raw: unknown, care: Record<string, unknown>) {
  let value = String(raw || '').trim()
  if (!value.endsWith('.')) value = value ? `${value}.` : ''
  if (value) value = value.charAt(0).toUpperCase() + value.slice(1)
  const words = value.split(/\s+/).filter(Boolean).length
  if (value && words >= 4 && words <= 20) return value

  const mainRisk = asProfileArray(care.main_risk)
  const currentState = asProfileArray(care.current_state)
  const primary = mainRisk[0] || currentState[0]
  if (!primary) return ''
  const lower = primary.toLowerCase()
  if (/health|anxious|symptom|reassur/i.test(lower)) return 'Health anxiety with frequent reassurance-seeking behaviour.'
  if (/isolat|withdraw|alone/i.test(lower)) return 'Increasing social withdrawal and emotional isolation.'
  if (/academic|school|exam|study/i.test(lower)) return 'Persistent academic stress affecting daily functioning.'
  if (/family|parent|home/i.test(lower)) return 'Ongoing family conflict affecting emotional wellbeing.'
  if (/sleep/i.test(lower)) return 'Sleep difficulties contributing to daytime exhaustion.'
  return `${primary.charAt(0).toUpperCase()}${primary.slice(1)} affecting current wellbeing.`
}

function normalizeCasePreview(raw: unknown, overallSummary: string, care: Record<string, unknown>, dynamicProfile: Record<string, unknown>) {
  const value = String(raw || '').trim()
  const words = value.split(/\s+/).filter(Boolean).length
  if (value && words >= 20 && words <= 80) return value

  const summary = String(overallSummary || '').trim()
  if (summary) {
    const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary]
    let preview = sentences.slice(0, 2).join(' ').trim()
    const coping = asProfileArray(dynamicProfile.coping_methods)[0]
    if (coping && preview.split(/\s+/).length < 45) {
      preview = `${preview} ${coping.charAt(0).toUpperCase()}${coping.slice(1)} has become a meaningful calming routine during difficult periods.`
    }
    const previewWords = preview.split(/\s+/).filter(Boolean)
    if (previewWords.length > 65) {
      preview = `${previewWords.slice(0, 65).join(' ').replace(/[,;]$/, '')}.`
    }
    if (preview.split(/\s+/).length >= 20) return preview
  }

  const concern = normalizeCurrentConcern('', care)
  if (concern) {
    return `${concern} Further detail will build as support contacts continue.`
  }
  return ''
}

function mergeInsights(
  existing,
  generated,
  fallback,
  {
    summary,
    preferredName,
    messages,
    offlineSessions = [],
    aiSessions = [],
    questionnaire = null,
    atAGlanceGenerated = '',
  },
) {
  const prev = existing || {}
  const gen = generated || {}
  const base = fallback || {}
  const transcriptRisk = inferRiskFromTranscript(messages) || 'low'
  const risk = pickHigherRisk(
    transcriptRisk,
    pickHigherRisk(
      ['low', 'medium', 'high'].includes(gen.risk_level) ? gen.risk_level : 'low',
      pickHigherRisk(
        ['low', 'medium', 'high'].includes(base.risk_level) ? base.risk_level : 'low',
        prev.risk_level || 'low',
      ),
    ),
  )

  const latestChange = pickText(gen.latest_change, base.latest_change)
  const morningBrief = normalizeMorningBrief(
    gen.morning_brief || base.morning_brief,
    base.morning_brief || buildFallbackMorningBrief(),
  )

  const dynamic_profile = mergeDynamicProfile(
    prev.dynamic_profile as Record<string, unknown> | undefined,
    (gen.dynamic_profile || base.dynamic_profile) as Record<string, unknown> | undefined,
    questionnaire,
  )

  const careInsights = regenerateCareInsights({
    aiGenerated: {
      current_state: gen.current_state,
      main_risk: gen.main_risk,
      best_communication_approach: gen.best_communication_approach,
      latest_change: gen.latest_change,
    },
    saved: prev,
    context: {
      youthName: preferredName,
      questionnaire,
      dynamicProfile: dynamic_profile,
      existingCareInsights: prev,
      messages,
      aiSessions,
      offlineSessions,
      latestExchangeSummary: summary,
    },
  })

  const atAGlanceContext = collectAtAGlanceContext({
    youthName: preferredName,
    questionnaire,
    dynamicProfile: dynamic_profile,
    careInsights: careInsights,
    existingOverallSummary: String(prev.overall_summary || '').trim(),
    messages,
    aiSessions,
    offlineSessions,
  })

  const aiGlance = String(atAGlanceGenerated || gen.overall_summary || '').trim()
  const overall_summary = preserveQualityAtAGlance(
    prev.overall_summary,
    hasLockedAtAGlanceQuality(aiGlance)
      ? aiGlance
      : regenerateAtAGlance({
          aiGenerated: aiGlance,
          context: atAGlanceContext,
        }),
  )

  const current_concern = normalizeCurrentConcern(gen.current_concern, careInsights)
  const case_preview = normalizeCasePreview(
    gen.case_preview,
    overall_summary,
    careInsights,
    dynamic_profile as Record<string, unknown>,
  )

  return {
    current_state: careInsights.current_state,
    risk_level: risk,
    main_risk: careInsights.main_risk,
    best_communication_approach: careInsights.best_communication_approach,
    latest_change: careInsights.latest_change,
    overall_summary,
    dynamic_profile,
    current_concern,
    case_preview,
    morning_brief: morningBrief,
    staff_edited_fields: prev.staff_edited_fields || {},
  }
}

async function upsertDynamicInsightsAttempt(client, youthId, merged: Record<string, unknown>) {
  const writeClient = getServiceClient()
  const { data: existing, error: readError } = await writeClient.database
    .from('ai_dynamic_insights')
    .select('*')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (readError) {
    console.error('[youth-ai-chat] insights read failed:', readError.message)
    throw new Error(`Insights read failed: ${readError.message}`)
  }

  if (existing) {
    const { data, error } = await writeClient.database
      .from('ai_dynamic_insights')
      .update(merged)
      .eq('youth_id', youthId)
      .select('*')
      .single()
    if (error) throw error
    console.log('[youth-ai-chat] insights updated:', data?.id)
    return data
  }

  const { data, error } = await writeClient.database
    .from('ai_dynamic_insights')
    .insert([{ youth_id: youthId, ...merged }])
    .select('*')
    .single()

  if (error) throw error
  console.log('[youth-ai-chat] insights inserted:', data?.id)
  return data
}

function stripOptionalInsightFields(merged: Record<string, unknown>) {
  const { dynamic_profile: _dp, morning_brief: _mb, ...core } = merged
  return core
}

function isOptionalInsightColumnError(error: unknown) {
  const msg = String((error as Error)?.message || '')
  return /dynamic_profile|morning_brief|schema cache|column/i.test(msg)
}

async function upsertDynamicInsights(client, youthId, merged) {
  try {
    return await upsertDynamicInsightsAttempt(client, youthId, merged)
  } catch (error) {
    if (!isOptionalInsightColumnError(error)) {
      console.error('[youth-ai-chat] insights write failed:', (error as Error).message)
      throw error
    }
    console.warn('[youth-ai-chat] retrying insights write without optional columns')
    return await upsertDynamicInsightsAttempt(client, youthId, stripOptionalInsightFields(merged))
  }
}

async function getStaffInsightsContext(client) {
  const { data: userData, error: userError } = await client.auth.getCurrentUser()
  if (userError || !userData?.user?.id) throw new Error('Unauthorized')

  const { data: profile, error: profileError } = await client.database
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile || profile.role !== 'staff') throw new Error('Only staff accounts can regenerate youth insights')

  return { user: userData.user, profile }
}

async function getYouthContext(client) {
  const { data: userData, error: userError } = await client.auth.getCurrentUser()
  if (userError || !userData?.user?.id) throw new Error('Unauthorized')

  const { data: profile, error: profileError } = await client.database
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile || profile.role !== 'youth') throw new Error('Only youth accounts can use AI companion')

  const { data: youth, error: youthError } = await client.database
    .from('youth_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (youthError) throw youthError
  if (!youth) throw new Error('Youth profile not found')

  return {
    profile,
    youth,
    preferredName: youth.preferred_name || profile.display_name || profile.email.split('@')[0],
  }
}

const CHAT_MODEL_FALLBACK = 'google/gemini-flash-1.5'
const CHAT_MODEL_TERTIARY = 'openai/gpt-4o-mini'

async function callChatGpt(messages, label = 'chat') {
  const models = [CHAT_MODEL, CHAT_MODEL_FALLBACK, CHAT_MODEL_TERTIARY].filter(
    (model, index, list) => model && list.indexOf(model) === index,
  )
  let lastError: Error | null = null
  for (const model of models) {
    try {
      return await callChatGptOnce(messages, label, model)
    } catch (error) {
      lastError = error as Error
      console.error(`[youth-ai-chat] ${label} model ${model} failed:`, lastError.message)
    }
  }
  throw lastError || new Error('All chat models failed')
}

async function callChatGptOnce(messages, label, model) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  const PROFILE_LABELS = new Set([
    'insights',
    'full-profile-bundle',
    'dynamic-profile',
    'care-insights',
    'at-a-glance',
  ])

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('INSFORGE_BASE_URL') || 'https://carebridge.ai',
      'X-Title': 'CareBridge AI',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: PROFILE_LABELS.has(label) ? PROFILE_GENERATION_TEMPERATURE : 0.8,
      max_tokens:
        label === 'insights'
          ? 1400
          : label === 'session-summary'
            ? 1000
            : label === 'at-a-glance' || label === 'dynamic-profile' || label === 'care-insights' || label === 'full-profile-bundle'
              ? 2000
              : 1600,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`ChatGPT ${model}: ${response.status} ${detail.slice(0, 200)}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (!content) throw new Error(`ChatGPT ${model}: empty response`)

  return { parsed: JSON.parse(content), model }
}

function buildChatMessagesFromHistory(
  history: { sender: string; message: string }[],
  trimmed: string,
  chatCtx: ChatContext,
) {
  const turns = (history || []).filter((m) => m.sender === 'youth' || m.sender === 'ai')
  const prior = turns.slice(0, -1)
  const messages: { role: string; content: string }[] = [
    {
      role: 'system',
      content: buildChatSystemPrompt(chatCtx, 'chat', trimmed, { hasHistory: prior.length > 0 }),
    },
  ]
  for (const row of prior) {
    messages.push({
      role: row.sender === 'youth' ? 'user' : 'assistant',
      content: String(row.message || ''),
    })
  }
  messages.push({ role: 'user', content: trimmed })
  return messages
}

function youthMessageWordCount(message: string) {
  return String(message || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function needsRichReply(message: string) {
  const text = String(message || '').trim()
  if (youthMessageWordCount(text) >= 40) return true
  return /only .+ make(s)? me feel|feel better|hitting|hit me|beating|scold|yell|abuse|bully|suicide|self.?harm|崩溃|打|骂|欺负|跟踪|想自杀|sad|stress|stressed|overwhelm|anxious|irritat|school|bad day|feelings|misunderstood|noise|click|sensory|pen|parent|family|lonely|withdraw/i.test(
    text,
  )
}

function isGenericShortReply(reply: string) {
  const text = String(reply || '').trim()
  if (!text) return true
  if (
    /what'?s been weighing on you|you can take your time, and i'?ll listen|would you like to talk about what'?s on your mind\?$/i.test(text) &&
    !/•/.test(text)
  ) {
    return true
  }
  return false
}

function isReplyTooShort(message: string, reply: string) {
  const text = String(reply || '').trim()
  if (!text || isGenericShortReply(text)) return true
  if (!needsRichReply(message)) return text.length < 80
  const isEnglish = !/[\u4e00-\u9fff]/.test(message)
  if (isEnglish) return text.length < 200 || !/•/.test(text)
  return text.length < 100 || !/•/.test(text)
}

const SESSION_SUMMARY_PROMPT = `Generate session_summary as a professional social work case note from this after-hours AI chat.
This is NOT a transcript summary. Interpret what the interaction reveals about emotional state, behavioural patterns and current difficulties.

Style: one paragraph, 60–100 words, neutral, professional, observation-based, natural flow.
Explain what this interaction tells us about the youth, not what happened during the conversation.

Do NOT write:
"The youth discussed...", "The youth shared...", "The latest session...", "Recent records indicate...", "The conversation focused on...", "The youth reported...", "Continued monitoring is recommended."
Do NOT retell the transcript. Do NOT list events chronologically. English only.

Return ONLY valid JSON:
{ "session_summary": "one paragraph case impression" }`

function buildSessionSummaryFallback(
  messages: { sender: string; message: string }[],
  moodCheckIn: string | null | undefined,
  _preferredName: string,
) {
  const youthOnly = (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter((line) => line && !MOOD_CHECKIN_LINE.test(line))
    .join('\n')

  if (!youthOnly.trim()) {
    return 'Limited disclosure during this contact; current presentation and difficulties could not be fully assessed.'
  }

  const corpus = youthOnly
  const mood = moodCheckIn ? String(moodCheckIn).toLowerCase() : ''
  let opening = 'Emotional presentation appears guarded yet willing to engage when approached calmly'
  if (mood === 'sad') opening = 'Presentation on contact appears subdued and low in mood'
  else if (mood === 'stressed' || mood === 'overwhelmed') {
    opening = 'Presentation on contact appears tense and emotionally loaded'
  } else if (mood === 'good' || mood === 'okay') {
    opening = 'Presentation on contact appears settled, though underlying strain may still be present'
  } else if (/sad|unhappy|low/i.test(corpus)) {
    opening = 'Emotional presentation appears lowered and somewhat withdrawn'
  } else if (/stress|overwhelm|anxious|worry/i.test(corpus)) {
    opening = 'Emotional presentation suggests heightened anxiety and internal pressure'
  }

  const sentences: string[] = []

  if (/bird|leaf|headphone|aquarium|nature|counting|collect/i.test(corpus)) {
    sentences.push(
      `${opening}, with a clear preference for quiet, solitary activities that offer sensory calm and emotional regulation.`,
      'Engagement with nature-based rituals and low-stimulation environments appears to function as a primary coping strategy when social or family demands feel overwhelming.',
      'These patterns suggest resourcefulness in creating private restorative space, though underlying sadness and need for solitude may reflect ongoing relational strain.',
    )
  } else if (/body image|appearance|weight|eating|meal|food|guilt/i.test(corpus)) {
    sentences.push(
      `${opening}, with preoccupation around body image, weight and eating routines emerging as a central difficulty.`,
      'Guilt after eating and skipped meals point to self-critical patterns around food, while social comparison appears to intensify unrealistic standards and distress.',
      'Enjoyment of previously valued activities seems reduced, and self-worth appears increasingly tied to appearance rather than other strengths.',
    )
  } else if (/exam|academic|study|grade|school|sleep|insomnia/i.test(corpus)) {
    sentences.push(
      `${opening}, with academic pressure and exam-related worry appearing to dominate mood and daily functioning.`,
      'Patterns of overwhelm around school demands suggest difficulty sustaining previous routines, with fatigue likely affecting concentration and recovery time.',
      'Underlying concern appears to centre on fear of disappointing others while capacity to cope with competing demands is narrowing.',
    )
  } else if (/lonely|alone|isolated|withdraw|solitude/i.test(corpus)) {
    sentences.push(
      `${opening}, with social withdrawal and loneliness shaping day-to-day routines and sense of connection.`,
      'Limited peer contact and reduced participation in outside activities suggest shrinking social confidence, leaving more time alone with ruminative thoughts.',
    )
  } else if (/guitar|piano|music|draw|minecraft|game/i.test(corpus)) {
    sentences.push(
      `${opening}, with creative or immersive private activities emerging as a meaningful source of calm and emotional relief.`,
      'Reliance on restorative rituals before sleep or during distress suggests coping resources are present but may be narrowing as other supports feel less available.',
    )
  } else {
    sentences.push(
      `${opening}, with several day-to-day stressors affecting mood and routine stability.`,
      'Recurring worry or reduced enjoyment of usual activities suggest coping resources are stretched, though specific triggers vary across the interaction.',
      'A calm, validating stance appears most likely to sustain engagement while underlying difficulties are explored further.',
    )
  }

  if (/gentle|companionship|listen/i.test(corpus)) {
    sentences.push('A clear preference for gentle, listening-centred contact was evident throughout the interaction.')
  }

  const words = sentences.join(' ').split(/\s+/).filter(Boolean)
  if (words.length > 100) return `${words.slice(0, 100).join(' ').replace(/[,;]$/, '')}.`
  return sentences.join(' ')
}

function isBannedSessionSummaryPhrase(text: string) {
  const banned = [
    /\bthe youth discussed\b/i,
    /\bthe youth shared\b/i,
    /\bthe youth reported\b/i,
    /\bthe youth said\b/i,
    /\bthe latest session\b/i,
    /\brecent records indicate\b/i,
    /\bthe conversation focused on\b/i,
    /\bcontinued monitoring is recommended\b/i,
    /\bpersistent concerns around\b/i,
  ]
  return banned.some((pattern) => pattern.test(String(text || '')))
}

function isSessionSummaryTooShort(text: string, _transcript = '') {
  const value = String(text || '').trim()
  if (!value) return true
  if (/[\u4e00-\u9fff]/.test(value)) return true
  const words = value.split(/\s+/).filter(Boolean).length
  if (words < 55) return true
  if (words > 130) return true
  if (isBannedSessionSummaryPhrase(value)) return true
  return false
}

async function generateSessionSummary(
  client,
  sessionId: string,
  preferredName: string,
  { riskLevel }: { riskLevel?: string } = {},
) {
  const [{ data: messages, error: msgError }, { data: session, error: sessError }] = await Promise.all([
    client.database
      .from('ai_messages')
      .select('sender, message, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(80),
    client.database
      .from('ai_chat_sessions')
      .select('mood_check_in, risk_level')
      .eq('id', sessionId)
      .maybeSingle(),
  ])

  if (msgError) throw msgError
  if (sessError) throw sessError

  const transcript = (messages || [])
    .filter((m) => m.sender === 'youth' || m.sender === 'ai')
    .map((m) => `${m.sender}: ${m.message}`)
    .join('\n')

  const fallback = buildSessionSummaryFallback(
    messages || [],
    session?.mood_check_in,
    preferredName,
  )

  if (!transcript.trim()) return fallback

  try {
    const payload = {
      youthName: preferredName,
      moodCheckIn: session?.mood_check_in || null,
      riskLevel: riskLevel || session?.risk_level || 'low',
      messageCount: (messages || []).filter((m) => m.sender === 'youth').length,
      transcript,
      instruction:
        'Write a 60-100 word social work case impression. Interpret presentation and patterns; do not retell the chat.',
    }

    const callSummary = (extra = '') =>
      callChatGptWithTimeout(
        [
          { role: 'system', content: SESSION_SUMMARY_PROMPT },
          { role: 'user', content: JSON.stringify(extra ? { ...payload, retryNote: extra } : payload) },
        ],
        'session-summary',
        28000,
      )

    let aiResult = await callSummary()
    let text = String(aiResult.parsed.session_summary || aiResult.parsed.summary || '').trim()

    if (isSessionSummaryTooShort(text, transcript)) {
      console.warn('[youth-ai-chat] session summary incomplete, retrying')
      aiResult = await callSummary(
        'Rewrite as one 60-100 word social work case impression paragraph. Interpret emotional presentation and behavioural patterns. Do not retell the conversation or use phrases like "The youth shared/discussed/reported".',
      )
      text = String(aiResult.parsed.session_summary || aiResult.parsed.summary || '').trim()
    }

    if (!isSessionSummaryTooShort(text, transcript)) return text
    console.warn('[youth-ai-chat] session summary still too short, using fallback')
  } catch (error) {
    console.error('[youth-ai-chat] session summary AI failed:', error.message)
  }

  return fallback
}

function buildStaffSummaryFromMessage(message: string) {
  const text = String(message || '').trim()
  if (/想自杀|自杀|不想活|自伤|suicide|kill myself|hurt myself/i.test(text)) {
    return 'Youth expressed suicidal ideation in after-hours AI chat and needs urgent staff follow-up.'
  }
  if (/霸凌|bully|欺负|扔东西/i.test(text)) {
    return 'Youth reported bullying or peer mistreatment in after-hours AI chat.'
  }
  if (/跟踪|跟着我|stalk|盯着我/i.test(text)) {
    return 'Youth reported feeling followed or unsafe in after-hours AI chat.'
  }
  if (/崩溃|好崩溃|overwhelmed|受不了|撑不住/i.test(text)) {
    return 'Youth reported acute emotional overwhelm in after-hours AI chat.'
  }
  if (/爸妈|父母|吵架|hitting|hit me|abuse/i.test(text)) {
    return 'Youth reported family conflict or abuse affecting their wellbeing in after-hours AI chat.'
  }
  return 'Youth checked in with the after-hours AI companion.'
}

function youthAlreadyStatedDuration(message: string) {
  return /很久|很久了|好久了|一直|持续|长期|一段时间|for a long time|a while|months?/i.test(message)
}

function replyContradictsUserMessage(message: string, reply: string) {
  const msg = String(message || '').trim()
  const text = String(reply || '').trim()
  if (!msg || !text) return false

  if (youthAlreadyStatedDuration(msg) && /第一次|first time|还是已经很久|多久了|多长时间|持续多久|有多久了|刚开始|首次/i.test(text)) {
    return true
  }
  if (/想自杀|自杀|自伤|suicide|kill myself/i.test(msg) && !/安全|自杀|自伤|心疼|陪你|危机|紧急|safe|worried|here with you/i.test(text)) {
    return true
  }
  return false
}

function polishReplyForUserMessage(message: string, reply: string) {
  let text = String(reply || '').trim()
  if (!text) return text

  if (youthAlreadyStatedDuration(message)) {
    text = text
      .replace(/这是第一次有这样的感觉还是已经很久了[？?]?/g, '你已经撑了这么久，真的很不容易。')
      .replace(/这是第一次还是已经很久了[？?]?/g, '你已经撑了这么久，真的很不容易。')
      .replace(/是第一次还是已经很久了[？?]?/g, '你已经撑了这么久，真的很不容易。')
      .replace(/第一次有这样的感觉还是已经很久了[？?]?/g, '你已经撑了这么久，真的很不容易。')
      .replace(/Is this the first time|first time or has it been going on/i, 'You have been carrying this for a while, and that is really hard.')
  }

  return text
}

function finalizeReply(message: string, reply: string) {
  return polishReplyForUserMessage(message, reply)
}

function isReplyOffTopic(_latest: string, _reply: string) {
  return false
}

function snippetReflect(message: string, maxWords = 18) {
  const words = String(message || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
  if (!words.length) return 'what you shared'
  const slice = words.slice(0, maxWords).join(' ')
  return `${slice}${words.length > maxWords ? '…' : ''}`
}

function buildCasualPositiveFallback(message: string) {
  const raw = String(message || '').trim()
  const text = normalizeYouthCasualText(raw)
  const heard = snippetReflect(text, 12)
  if (/[\u4e00-\u9fff]/.test(raw)) {
    return `谢谢你愿意跟我分享这个，听起来「${heard}」对你来说是一件很温暖的小事。 • 把这些让你开心的小事记下来，心情不好时可以翻看 • 如果愿意，可以多说说你喜欢它的哪一点 • 享受这些小快乐是没问题的，不用觉得不好意思。你今天还想多聊聊吗？`
  }
  if (/piano|guitar|violin|drums|music|sing/i.test(text)) {
    return `I'm glad you mentioned music — it sounds like ${heard} matters to you. • Playing or listening can be a real way to settle when the day feels heavy • You could notice what you enjoy most: the sound, the rhythm, or how it feels in your hands • Small creative rituals like this are worth keeping. What do you like most about it?`
  }
  if (/cookie|snack|food|eat|pizza|cake/i.test(text)) {
    return `I'm glad you shared that — it sounds like ${heard} is a small comfort that feels good to you. • Enjoying simple treats is completely okay, especially on harder days • You could notice what you like about it — taste, warmth, or a familiar ritual • Little pleasures like this can be gentle anchors. What is your favourite part about it?`
  }
  return `I'm glad you shared that — it sounds like ${heard} is something that brings you a little comfort or joy. • Small likes such as food, hobbies, or routines can be real anchors on harder days • If you want, tell me what you enjoy most about it — taste, smell, memory, or ritual • It's completely okay to lean on simple things that feel good. What is it about that you like best?`
}

function buildRichEnglishEmotionalFallback(message: string) {
  const text = String(message || '').trim()
  const heard = snippetReflect(text)

  if (/school|class|teacher|exam|homework|pen|click|noise|sensory|irritat|anxious|misunderstood|parent|sensitive/i.test(text)) {
    return `Hearing you describe ${heard}, I'm really glad you told me — it sounds like today asked a lot of your senses and your patience.

• Stepping somewhere quieter, even briefly, can help your body settle after loud or irritating moments
• The routines you mentioned — like caring for pens, writing, or reading online — sound like thoughtful ways you regulate when the world feels too loud
• Wanting others to understand you are not trying to be difficult is completely fair — you are trying to cope
• If adults at home feel dismissive, you do not have to explain every sensitivity alone; your youth worker can help bridge that gap

Feeling irritated and sad at the same time makes sense after a day like this. What part felt heaviest — school, home, or both?`
  }

  return `I'm sorry to hear that you're going through this. It's okay to have these feelings, and it matters that you told me. Hearing you mention ${heard}, I can tell today has not felt easy.

• Sometimes writing down your thoughts can help clarify what is on your mind
• Music, drawing, or a quiet ritual you enjoy can be a soothing way to express feelings
• If something specific is weighing on you, talking it through might help lighten the load
• Remember that it is okay to seek comfort in small things you enjoy — they are not silly

Is there anything in particular that has been bothering you, or something that could make you feel a bit better tonight?`
}

function buildQuickFallbackReply(message: string) {
  const text = String(message || '').trim()
  const prolonged = youthAlreadyStatedDuration(text)
  const isChinese = /[\u4e00-\u9fff]/.test(text)

  if (/想自杀|自杀|不想活|自伤|hurt myself|suicide|kill myself/i.test(text)) {
    if (isChinese) {
      const heard =
        prolonged && /崩溃/i.test(text)
          ? '想自杀，而且已经崩溃很久了'
          : prolonged
            ? '这些感受已经持续很久，而且提到了自杀的念头'
            : '现在有自杀的念头'
      return `听到你说${heard}，我真的很心疼你，也很担心你的安全。你愿意把这些说出来，已经很勇敢了。

我想先确认：
• 你现在安全吗？身边有没有人可以陪着你？
• 如果此刻很难受，可以先深呼吸几次，让自己稍微缓一缓

你可以考虑：
• 马上联系你信任的大人、老师或社工，不要一个人扛着
• 拨打当地心理危机热线，会有人陪你说话
• 如果觉得自己可能马上伤害自己，请立刻联系紧急服务

${prolonged ? '你已经撑了这么久，一定非常疲惫，这不是你的错。' : '这些念头在压力很大的时候会出现，不代表你真的想结束一切。'}我们一步一步来，我会一直听你说。

你愿意告诉我，今晚是什么让你特别难受吗？`
    }
    const heard = prolonged ? 'these feelings have been going on for a long time and you mentioned suicide' : 'suicidal thoughts right now'
    return `Hearing you say ${heard}, I'm really worried about you — and I'm glad you told someone. That took courage.

First, I want to check:
• Are you safe right now? Is anyone with you?
• If you feel overwhelmed, try a few slow breaths to steady yourself

You could:
• Reach out to a trusted adult, teacher, or your youth worker tonight — you do not have to carry this alone
• Call a local crisis line — someone can stay with you on the phone
• If you might hurt yourself soon, contact emergency services right away

${prolonged ? 'You have been holding this for a long time, and that is exhausting — this is not your fault.' : 'These thoughts can appear when pressure is very high; they do not mean you have to act on them.'} We can take this one step at a time, and I'm here with you.

What feels hardest for you tonight?`
  }

  if (/霸凌|bully|扔东西|欺负/i.test(text)) {
    if (isChinese) {
      const thrown = /扔东西/i.test(text) ? '被人扔东西、被针对，' : '在学校被欺负，'
      const durationQ = prolonged
        ? '你已经忍受了一段时间，这真的很辛苦。'
        : '你愿意的话，可以告诉我：是同学还是学长？这种情况多久了？'
      return `听到你${thrown}我真的非常心疼你。这不是你的错，也不该发生在任何人身上。

我想先确认两件事：
• 你现在安全吗？他们还在身边吗？
• 你有没有受伤？

你可以考虑：
• 不要一个人扛着，告诉信得过的老师、社工或家长
• 尽量和朋友待在一起，减少落单的机会
• 如果再次发生，大声说「住手」，然后离开并马上报告

你会害怕、委屈、生气都很正常。${durationQ}我会一直听你说。`
    }
    return `Hearing that you are being bullied or targeted at school, I'm really sorry this is happening — and it is not your fault.

Let me check:
• Are you safe right now? Are they still nearby?
• Were you hurt?

You could:
• Tell a trusted teacher, counselor, or your youth worker — you should not face this alone
• Stay near friends when you can so you are less isolated
• If it happens again, say "stop," leave, and report it right away

Feeling scared, angry, or humiliated makes complete sense. ${prolonged ? 'You have been putting up with this for a while, and that is exhausting.' : 'If you are willing, who is involved and how long has this been going on?'} I'm here with you.`
  }

  if (/爸妈|父母|吵架|hitting|hit me|abuse|打/i.test(text)) {
    if (isChinese) {
      return `听到你说家里的事情让你很难受，我真的很心疼你。家本该是安全的地方，你会害怕或委屈都很正常。

我想先确认：
• 你现在安全吗？身边有人吗？
• 如果发生了肢体冲突，你有没有受伤？

你可以考虑：
• 告诉信得过的老师、社工或亲戚，不要一个人扛着
• 如果情况紧急，联系当地紧急服务或儿童保护机构
• 写下发生了什么，方便之后求助

你愿意告诉我，今晚最让你难受的是什么吗？`
    }
    return `Hearing what is happening at home, I'm really sorry you are going through this — you deserve to feel safe.

Let me check:
• Are you safe right now? Is anyone with you?
• If someone hit you, were you hurt?

You could:
• Tell a trusted teacher, counselor, or your youth worker as soon as you can
• If you are in immediate danger, contact emergency services or child protection
• Write down what happened — it can help when you ask for support

Feeling scared or angry is completely understandable. What happened tonight that felt hardest?`
  }

  if (isChinese) {
    return `谢谢你愿意跟我说这些，我在这里陪你。今晚有什么压在你心上吗？你可以慢慢说，我会认真听。 • 写下几个关键词，有时能让思绪清楚一点 • 做一件让你感到安静的小事，比如听音乐或画画 • 如果很难受，可以联系信任的大人或社工。`
  }

  if (needsRichReply(text)) {
    return buildRichEnglishEmotionalFallback(text)
  }

  const moodMatch = text.match(MOOD_CHECKIN_LINE)
  if (moodMatch) {
    const moodKey = moodMatch[1].charAt(0).toUpperCase() + moodMatch[1].slice(1).toLowerCase()
    if (MOOD_REPLIES[moodKey]) return MOOD_REPLIES[moodKey]
  }

  if (isCasualPositiveMessage(text)) {
    return buildCasualPositiveFallback(text)
  }

  return MOOD_REPLY_SAD
}

function staffEditedAt(meta: Record<string, unknown> | null | undefined, key: string) {
  return Boolean(meta && meta[key])
}

function buildStaffEditedSourcesFromContext(
  existing: Record<string, unknown> | null | undefined,
  sessions: Array<Record<string, unknown>> = [],
  offlineSessions: Array<Record<string, unknown>> = [],
) {
  const sources: Record<string, unknown> = {}
  const meta = (existing?.staff_edited_fields || {}) as Record<string, unknown>

  if (staffEditedAt(meta, 'overall_summary') && String(existing?.overall_summary || '').trim()) {
    sources.overall_summary = String(existing?.overall_summary).trim()
  }
  if (staffEditedAt(meta, 'current_state') && Array.isArray(existing?.current_state) && existing.current_state.length) {
    sources.current_state = existing.current_state
  }
  if (staffEditedAt(meta, 'main_risk') && Array.isArray(existing?.main_risk) && existing.main_risk.length) {
    sources.main_risk = existing.main_risk
  }
  if (
    staffEditedAt(meta, 'best_communication_approach') &&
    Array.isArray(existing?.best_communication_approach) &&
    existing.best_communication_approach.length
  ) {
    sources.best_communication_approach = existing.best_communication_approach
  }
  if (staffEditedAt(meta, 'latest_change') && String(existing?.latest_change || '').trim()) {
    sources.latest_change = String(existing?.latest_change).trim()
  }

  const dynamic = (existing?.dynamic_profile || {}) as Record<string, unknown>
  const dynamicEdits: Record<string, unknown> = {}
  for (const key of ['interests', 'personality', 'preferred_communication_style', 'living_arrangement', 'current_challenges', 'coping_methods']) {
    if (!staffEditedAt(meta, `dynamic_profile.${key}`)) continue
    const value = dynamic[key]
    if (Array.isArray(value) ? value.length : String(value || '').trim()) dynamicEdits[key] = value
  }
  if (Object.keys(dynamicEdits).length) sources.dynamic_profile = dynamicEdits

  const chatSummaries = (sessions || [])
    .filter((s) => staffEditedAt(s.staff_edited_fields as Record<string, unknown>, 'ai_summary') && String(s.ai_summary || '').trim())
    .map((s) => ({ session_date: s.session_date, ai_summary: String(s.ai_summary).trim() }))
  if (chatSummaries.length) sources.chatSessionSummaries = chatSummaries

  const offlineSummaries = (offlineSessions || [])
    .filter((s) => staffEditedAt(s.staff_edited_fields as Record<string, unknown>, 'ai_summary') && String(s.ai_summary || '').trim())
    .map((s) => ({ session_date: s.session_date, ai_summary: String(s.ai_summary).trim() }))
  if (offlineSummaries.length) sources.offlineSessionSummaries = offlineSummaries

  return Object.keys(sources).length ? sources : null
}

async function fetchInsightContext(client, youthId) {
  const [
    { data: messages, error: msgError },
    { data: sessions, error: sessError },
    { data: offlineSessions, error: offlineError },
    { data: questionnaireRow, error: questionnaireError },
    { data: existing },
  ] = await Promise.all([
    client.database
      .from('ai_messages')
      .select('sender, message, created_at')
      .eq('youth_id', youthId)
      .order('created_at', { ascending: true })
      .limit(200),
    client.database
      .from('ai_chat_sessions')
      .select('session_date, mood_check_in, ai_summary, risk_level, staff_edited_fields')
      .eq('youth_id', youthId)
      .order('session_date', { ascending: false })
      .limit(10),
    client.database
      .from('offline_counselling_sessions')
      .select('session_date, transcript, ai_summary, risk_level, status, suggested_follow_up, staff_edited_fields')
      .eq('youth_id', youthId)
      .eq('status', 'approved')
      .order('session_date', { ascending: true })
      .limit(10),
    client.database.from('youth_questionnaire').select('*').eq('youth_id', youthId).maybeSingle(),
    client.database.from('ai_dynamic_insights').select('*').eq('youth_id', youthId).maybeSingle(),
  ])

  if (msgError) throw msgError
  if (sessError) throw sessError
  if (offlineError) throw offlineError
  if (questionnaireError) throw questionnaireError

  return {
    messages: messages || [],
    sessions: sessions || [],
    offlineSessions: offlineSessions || [],
    questionnaire: normalizeQuestionnaireRow(questionnaireRow),
    existing,
  }
}

async function generateFullProfileBundle(
  preferredName: string,
  {
    questionnaire = null,
    existing = null,
    messages = [],
    aiSessions = [],
    offlineSessions = [],
    latestExchangeSummary = '',
  }: {
    questionnaire?: Record<string, unknown> | null
    existing?: Record<string, unknown> | null
    messages?: { sender: string; message: string; created_at?: string }[]
    aiSessions?: { session_date?: string; mood_check_in?: string; ai_summary?: string }[]
    offlineSessions?: Array<{ status?: string; session_date?: string; transcript?: string; ai_summary?: string }>
    latestExchangeSummary?: string
  },
) {
  const dynamicCtx = collectDynamicProfileContext({
    questionnaire,
    existingDynamic: existing?.dynamic_profile as Record<string, unknown> | undefined,
    messages,
    aiSessions,
    offlineSessions,
    overallSummary: String(existing?.overall_summary || '').trim(),
    careInsights: existing || null,
  })
  const careCtx = collectCareInsightsContext({
    youthName: preferredName,
    questionnaire,
    dynamicProfile: dynamicCtx.existingDynamicProfile,
    overallSummary: String(existing?.overall_summary || '').trim(),
    existingCareInsights: existing || null,
    messages,
    aiSessions,
    offlineSessions,
    latestExchangeSummary,
  })

  if (!dynamicCtx.youthSpeech && !dynamicCtx.sessionSummaries.length && !careCtx.latestInteraction) {
    const q = questionnaire as Record<string, unknown> | null
    const hasQuestionnaire = Boolean(
      q &&
        (asProfileArray(q.interests).length ||
          asProfileArray(q.personality).length ||
          asProfileArray(q.current_challenges).length ||
          String(q.living_arrangement || '').trim()),
    )
    if (!hasQuestionnaire) return null
  }

  const atAGlanceContext = collectAtAGlanceContext({
    youthName: preferredName,
    questionnaire,
    dynamicProfile: dynamicCtx.existingDynamicProfile,
    careInsights: existing || null,
    existingOverallSummary: String(existing?.overall_summary || '').trim(),
    messages,
    aiSessions,
    offlineSessions,
  })

  const aiResult = await callChatGpt(
    [
      { role: 'system', content: FULL_PROFILE_BUNDLE_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          youthName: preferredName,
          staticProfile: dynamicCtx.staticProfile,
          existingDynamicProfile: dynamicCtx.existingDynamicProfile,
          existingCareInsights: careCtx.existingCareInsights,
          youthSpeechSample: dynamicCtx.youthSpeech.slice(0, 5000),
          sessionSummaries: dynamicCtx.sessionSummaries.slice(0, 8),
          moodHistory: dynamicCtx.moodHistory,
          latestInteraction: careCtx.latestInteraction,
          latestExchangeSummary,
          atAGlanceContext: buildAtAGlanceAiPayload(atAGlanceContext),
          staffEditedSources: buildStaffEditedSourcesFromContext(existing, aiSessions, offlineSessions),
        }),
      },
    ],
    'full-profile-bundle',
  )

  const raw = (aiResult.parsed || {}) as Record<string, unknown>
  const dynamicRaw = (raw.dynamic_profile || {}) as Record<string, unknown>
  const dynamic_profile = regenerateDynamicProfile({ aiGenerated: dynamicRaw, questionnaire })
  const care = regenerateCareInsights({
    aiGenerated: {
      current_state: raw.current_state,
      main_risk: raw.main_risk,
      best_communication_approach: raw.best_communication_approach,
      latest_change: raw.latest_change,
    },
    saved: existing || {},
  })

  let overall_summary = String(raw.overall_summary || '').trim()
  if (!hasLockedAtAGlanceQuality(overall_summary)) {
    overall_summary = await generateAtAGlance(preferredName, {
      questionnaire,
      dynamicProfile: dynamic_profile,
      careInsights: care,
      existingOverallSummary: String(existing?.overall_summary || '').trim(),
      messages,
      aiSessions,
      offlineSessions,
    })
  }

  const hasBundle = Boolean(
    overall_summary ||
      hasDynamicProfileData(dynamic_profile) ||
      isCareInsightsQuality(care),
  )

  if (!hasBundle) return null

  console.log('[youth-ai-chat] full-profile-bundle AI model:', aiResult.model)
  const current_concern = normalizeCurrentConcern(raw.current_concern, care)
  const case_preview = normalizeCasePreview(raw.case_preview, overall_summary, care, dynamic_profile)
  return {
    overall_summary,
    dynamic_profile,
    ...care,
    current_concern,
    case_preview,
  }
}

function isDegradedInsightsBundle(merged: Record<string, unknown>) {
  const glance = String(merged.overall_summary || '').trim()
  if (!isAtAGlanceRuleFallback(glance)) return false
  return !isCareInsightsQuality({
    current_state: merged.current_state,
    main_risk: merged.main_risk,
    best_communication_approach: merged.best_communication_approach,
    latest_change: merged.latest_change,
  })
}

async function regenerateAllProfileInsights(
  client,
  youthId: string,
  preferredName: string,
  { summary = '', riskLevel = 'low' }: { summary?: string; riskLevel?: string } = {},
) {
  const { messages, sessions, offlineSessions, questionnaire, existing } = await fetchInsightContext(client, youthId)
  const hasYouthSpeech = youthLines(messages).length > 0
  const hasOfflineSignal = (offlineSessions || []).some(
    (s) => String(s.ai_summary || '').trim() || String(s.transcript || '').trim(),
  )
  const hasSessionSummaries = (sessions || []).some((s) => String(s.ai_summary || '').trim())
  const hasQuestionnaireSignal = Boolean(
    questionnaire &&
      (asProfileArray(questionnaire.interests).length ||
        asProfileArray(questionnaire.personality).length ||
        asProfileArray(questionnaire.current_challenges).length ||
        String(questionnaire.living_arrangement || '').trim()),
  )
  if (!hasYouthSpeech && !hasOfflineSignal && !hasSessionSummaries && !hasQuestionnaireSignal) {
    console.log('[youth-ai-chat] no youth, session, or questionnaire context for profile regen')
    return existing || null
  }

  const fallback = buildFallbackInsights()
  fallback.risk_level = pickHigherRisk(fallback.risk_level || 'low', riskLevel || 'low')

  console.log('[youth-ai-chat] starting full profile regen for', youthId)

  let generated: Record<string, unknown> | null = null
  try {
    generated = await generateFullProfileBundle(preferredName, {
      questionnaire,
      existing,
      messages,
      aiSessions: sessions,
      offlineSessions,
      latestExchangeSummary: summary,
    })
  } catch (bundleError) {
    console.error('[youth-ai-chat] full-profile-bundle failed, using sequential:', (bundleError as Error).message)
  }

  if (!generated) {
    const dynamicFromAi = await generateDynamicProfile(preferredName, {
      questionnaire,
      existingDynamic: existing?.dynamic_profile as Record<string, unknown> | undefined,
      messages,
      aiSessions: sessions,
      offlineSessions,
      overallSummary: String(existing?.overall_summary || '').trim(),
      careInsights: existing || null,
    })

    const atAGlanceGenerated = await generateAtAGlance(preferredName, {
      questionnaire,
      dynamicProfile: dynamicFromAi,
      careInsights: existing || null,
      existingOverallSummary: String(existing?.overall_summary || '').trim(),
      messages,
      aiSessions: sessions,
      offlineSessions,
    })

    const careFromAi = await generateCareInsights(preferredName, {
      questionnaire,
      dynamicProfile: dynamicFromAi,
      existingCareInsights: existing || null,
      messages,
      aiSessions: sessions,
      offlineSessions,
      overallSummary: atAGlanceGenerated || String(existing?.overall_summary || '').trim(),
      latestExchangeSummary: summary,
    })

    generated = {
      dynamic_profile: dynamicFromAi,
      overall_summary: atAGlanceGenerated,
      ...careFromAi,
    }
  }

  const dynamicFromAi = generated.dynamic_profile as Record<string, unknown>
  let dynamicProfileDisplay = profileDynamicFieldsForDisplay(dynamicFromAi)
  if (!hasDynamicProfileData(dynamicProfileDisplay)) {
    const dynamicCtx = collectDynamicProfileContext({
      questionnaire,
      existingDynamic: existing?.dynamic_profile as Record<string, unknown> | undefined,
      messages,
      aiSessions: sessions,
      offlineSessions,
      overallSummary: String(generated.overall_summary || '').trim(),
      careInsights: existing || null,
    })
    const dynamicFallback = buildDynamicProfileRuleFallback(dynamicCtx)
    if (hasDynamicProfileData(dynamicFallback)) {
      dynamicProfileDisplay = dynamicFallback
      generated.dynamic_profile = dynamicFallback
      console.log('[youth-ai-chat] using rule-based dynamic-profile fallback for', youthId)
    }
  }

  const atAGlanceGenerated = String(generated.overall_summary || '').trim()
  let careFromAi = {
    current_state: generated.current_state,
    main_risk: generated.main_risk,
    best_communication_approach: generated.best_communication_approach,
    latest_change: generated.latest_change,
  }

  if (!isCareInsightsQuality(careFromAi)) {
    const careCtx = collectCareInsightsContext({
      youthName: preferredName,
      questionnaire,
      dynamicProfile: dynamicFromAi,
      existingCareInsights: existing,
      messages,
      aiSessions: sessions,
      offlineSessions,
      latestExchangeSummary: summary,
    })
    const careFallback = buildCareInsightsRuleFallback(careCtx)
    if (isCareInsightsQuality(careFallback)) {
      careFromAi = careFallback
      generated.current_state = careFallback.current_state
      generated.main_risk = careFallback.main_risk
      generated.best_communication_approach = careFallback.best_communication_approach
      generated.latest_change = careFallback.latest_change
      console.log('[youth-ai-chat] using rule-based care-insights fallback for', youthId)
    }
  }

  if (
    !hasDynamicProfileData(dynamicFromAi) &&
    !hasLockedAtAGlanceQuality(String(atAGlanceGenerated || '')) &&
    !isCareInsightsQuality(careFromAi) &&
    !hasYouthSpeech &&
    !hasOfflineSignal &&
    !hasSessionSummaries
  ) {
    const atCtx = collectAtAGlanceContext({
      youthName: preferredName,
      questionnaire,
      dynamicProfile: dynamicFromAi,
      messages,
      aiSessions: sessions,
      offlineSessions,
    })
    const ruleSummary = buildAtAGlanceFallback(atCtx)
    if (ruleSummary) {
      generated.overall_summary = ruleSummary
      console.log('[youth-ai-chat] using rule-based at-a-glance fallback for', youthId)
    }
  }

  const merged = mergeInsights(
    existing,
    {
      dynamic_profile: dynamicProfileDisplay,
      overall_summary: String(generated.overall_summary || atAGlanceGenerated || '').trim(),
      current_concern: generated.current_concern,
      case_preview: generated.case_preview,
      ...careFromAi,
    },
    fallback,
    {
      summary,
      preferredName,
      messages,
      offlineSessions,
      aiSessions: sessions,
      questionnaire,
      atAGlanceGenerated,
    },
  )

  if (isDegradedInsightsBundle(merged as Record<string, unknown>)) {
    console.error(
      '[youth-ai-chat] refusing degraded insights save for',
      youthId,
      '- locked AI generation unavailable (check OpenRouter key/model limits)',
    )
    if (existing && isAtAGlanceRuleFallback(String(existing.overall_summary || ''))) {
      const cleared = { ...existing, overall_summary: '' }
      await upsertDynamicInsights(client, youthId, cleared)
      return cleared
    }
    return existing || null
  }

  const saved = await upsertDynamicInsights(client, youthId, merged)
  console.log('[youth-ai-chat] full profile regen saved for', youthId)
  return saved
}

/** Bump risk on insights row — creates row if missing so staff Profile view stays in sync. */
async function saveQuickRiskLevelOnly(
  client,
  youthId: string,
  riskLevel = 'low',
  crisisDetected = false,
) {
  const writeClient = getServiceClient()
  const { data: existing, error: readError } = await writeClient.database
    .from('ai_dynamic_insights')
    .select('id, risk_level, crisis_detected')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (readError) {
    console.error('[youth-ai-chat] quick risk read failed:', readError.message)
    return null
  }

  const nextRisk = pickHigherRisk(String(existing?.risk_level || 'low'), riskLevel || 'low')
  const nextCrisis = Boolean(existing?.crisis_detected) || crisisDetected

  if (!existing) {
    const insertPayload: Record<string, unknown> = {
      youth_id: youthId,
      risk_level: nextRisk,
      current_state: [],
      main_risk: [],
      best_communication_approach: [],
      latest_change: '',
      overall_summary: '',
    }
    if (nextCrisis) {
      insertPayload.crisis_detected = true
      insertPayload.last_crisis_at = new Date().toISOString()
    }
    const { data: saved, error: insertError } = await writeClient.database
      .from('ai_dynamic_insights')
      .insert([insertPayload])
      .select('*')
      .maybeSingle()
    if (insertError) {
      console.error('[youth-ai-chat] quick risk insert failed:', insertError.message)
      return null
    }
    return saved
  }

  if (nextRisk === existing.risk_level && nextCrisis === Boolean(existing.crisis_detected)) return existing

  const updatePayload: Record<string, unknown> = { risk_level: nextRisk }
  if (nextCrisis && !existing.crisis_detected) {
    updatePayload.crisis_detected = true
    updatePayload.last_crisis_at = new Date().toISOString()
  } else if (nextCrisis) {
    updatePayload.crisis_detected = true
  }

  const { data: saved, error: updateError } = await writeClient.database
    .from('ai_dynamic_insights')
    .update(updatePayload)
    .eq('youth_id', youthId)
    .select('*')
    .maybeSingle()

  if (updateError) {
    console.error('[youth-ai-chat] quick risk update failed:', updateError.message)
    return existing
  }
  return saved || existing
}

async function saveSessionCrisisFlag(
  client,
  sessionId: string,
  { riskLevel, crisisDetected }: { riskLevel: string; crisisDetected: boolean },
) {
  if (!crisisDetected) return
  const { error } = await client.database
    .from('ai_chat_sessions')
    .update({ crisis_detected: true, risk_level: riskLevel })
    .eq('id', sessionId)
  if (error) {
    console.error('[youth-ai-chat] session crisis flag update failed:', error.message)
  }
}

const RISK_ORDER = { low: 0, medium: 1, high: 2 }

function pickHigherRisk(a: string, b: string) {
  return (RISK_ORDER[a] ?? 0) >= (RISK_ORDER[b] ?? 0) ? a : b
}

function normalizeSafetyAssessment(
  baseRisk: string,
  parsed: { riskLevel?: string; crisisDetected?: boolean; escalationNeeded?: boolean } = {},
) {
  const parsedRisk = ['low', 'medium', 'high'].includes(String(parsed.riskLevel || ''))
    ? String(parsed.riskLevel)
    : 'low'
  const riskLevel = pickHigherRisk(baseRisk || 'low', parsedRisk)
  const crisisDetected = riskLevel === 'high' || Boolean(parsed.crisisDetected)
  const escalationNeeded = crisisDetected || Boolean(parsed.escalationNeeded)
  return { riskLevel, crisisDetected, escalationNeeded }
}

async function syncInsightsAfterChat(
  client,
  youthId: string,
  preferredName: string,
  { summary, riskLevel }: { summary: string; riskLevel: string },
) {
  return regenerateAllProfileInsights(client, youthId, preferredName, { summary, riskLevel })
}

function scheduleBackgroundWork(work: () => Promise<unknown>) {
  const task = work().catch((err) => {
    console.error('[youth-ai-chat] background work failed:', (err as Error).message)
  })
  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task)
  }
  return task
}

async function finishSessionAfterReply(
  client,
  {
    sessionId,
    youthId,
    preferredName,
    riskLevel,
    summaryFallback,
    history = [],
    moodCheckIn = null,
  }: {
    sessionId: string
    youthId: string
    preferredName: string
    riskLevel: string
    summaryFallback: string
    history?: { sender: string; message: string }[]
    moodCheckIn?: string | null
  },
) {
  let summary = summaryFallback
  try {
    summary = await generateSessionSummary(client, sessionId, preferredName, { riskLevel })
  } catch (summaryError) {
    console.error('[youth-ai-chat] session summary failed:', (summaryError as Error).message)
    if (history.length) {
      summary = buildSessionSummaryFallback(history, moodCheckIn, preferredName)
    }
  }

  await client.database.from('ai_chat_sessions').update({
    ai_summary: summary,
    risk_level: riskLevel,
  }).eq('id', sessionId)

  await regenerateAllProfileInsights(client, youthId, preferredName, { summary, riskLevel })
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const client = getClient(req)
    const body = await req.json()
    const { action } = body

    if (action === 'repairYouthInsights') {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader ? authHeader.replace('Bearer ', '') : ''
      const apiKey = Deno.env.get('API_KEY') || ''
      const anonKey = Deno.env.get('ANON_KEY') || ''
      const allowed = new Set([apiKey, anonKey].filter(Boolean))
      if (!token || !allowed.has(token)) {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }

      const { youthId, summary = '', riskLevel = 'low' } = body
      if (!youthId) return jsonResponse({ error: 'youthId required' }, 400)

      const serviceClient = getServiceClient()
      const { data: youth, error: youthError } = await serviceClient.database
        .from('youth_profiles')
        .select('id, preferred_name')
        .eq('id', youthId)
        .maybeSingle()

      if (youthError || !youth) return jsonResponse({ error: 'Youth not found' }, 404)

      const preferredName = String(youth.preferred_name || 'Youth').trim() || 'Youth'
      const insights = await regenerateAllProfileInsights(serviceClient, youthId, preferredName, {
        summary: String(summary || '').trim(),
        riskLevel: ['low', 'medium', 'high'].includes(riskLevel) ? riskLevel : 'low',
      })
      return jsonResponse({ ok: true, insights })
    }

    if (action === 'regenerateProfileInsights') {
      await getStaffInsightsContext(client)
      const { youthId, summary = '', riskLevel = 'low' } = body
      if (!youthId) return jsonResponse({ error: 'youthId required' }, 400)

      const { data: youth, error: youthError } = await client.database
        .from('youth_profiles')
        .select('id, preferred_name')
        .eq('id', youthId)
        .maybeSingle()

      if (youthError || !youth) return jsonResponse({ error: 'Youth not found' }, 404)

      const preferredName = String(youth.preferred_name || 'Youth').trim() || 'Youth'
      const insights = await regenerateAllProfileInsights(client, youthId, preferredName, { summary, riskLevel })
      return jsonResponse({ ok: true, insights })
    }

    const ctx = await getYouthContext(client)

    if (action === 'syncProfileInsights') {
      const insights = await regenerateAllProfileInsights(client, ctx.youth.id, ctx.preferredName, {
        summary: String(body.summary || '').trim(),
        riskLevel: ['low', 'medium', 'high'].includes(body.riskLevel) ? body.riskLevel : 'low',
      })
      return jsonResponse({ ok: true, insights })
    }

    if (action === 'recordMood') {
      const { sessionId, mood } = body
      const moodLine = `I'm feeling ${mood} today.`

      await client.database.from('ai_chat_sessions').update({
        mood_check_in: mood,
      }).eq('id', sessionId)

      await client.database.from('ai_messages').insert([
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'youth', message: moodLine },
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'system', message: `Mood check-in: ${mood}` },
      ])

      const chatCtx = await fetchChatContext(client, ctx.youth.id, ctx.preferredName)
      let reply = MOOD_REPLIES[mood] || MOOD_REPLIES.Okay
      let summary = `Mood check-in recorded (${mood}).`
      let riskLevel = 'low'
      let crisisDetected = false
      let escalationNeeded = false
      let model = 'mood-check-in-fallback'
      let aiParsed: { riskLevel?: string; crisisDetected?: boolean; escalationNeeded?: boolean } = {}

      try {
        const moodMessages = [
          { role: 'system', content: buildChatSystemPrompt(chatCtx, 'mood') },
          { role: 'user', content: `Today's mood check-in: ${mood}. Youth message: "${moodLine}"` },
        ]
        const { parsed, model: usedModel } = await callChatGptWithTimeout(moodMessages, 'mood', 18000)
        aiParsed = parsed
        const moodCandidate = String(parsed.reply || '').trim()
        if (moodCandidate && !isGenericShortReply(moodCandidate) && moodCandidate.length >= 80) {
          reply = moodCandidate
        }
        summary = parsed.summary || summary
        model = usedModel
      } catch (moodAiError) {
        console.error('[youth-ai-chat] mood AI failed, using fallback:', moodAiError.message)
      }

      ;({ riskLevel, crisisDetected, escalationNeeded } = normalizeSafetyAssessment('low', aiParsed))

      await client.database.from('ai_messages').insert([
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'ai', message: reply },
      ])

      await client.database.from('ai_chat_sessions').update({
        risk_level: riskLevel,
        ...(crisisDetected ? { crisis_detected: true } : {}),
      }).eq('id', sessionId)

      try {
        await saveSessionCrisisFlag(client, sessionId, { riskLevel, crisisDetected })
        await saveQuickRiskLevelOnly(client, ctx.youth.id, riskLevel, crisisDetected)
      } catch (riskError) {
        console.error('[youth-ai-chat] recordMood crisis/risk update failed:', (riskError as Error).message)
      }

      try {
        await finishSessionAfterReply(client, {
          sessionId,
          youthId: ctx.youth.id,
          preferredName: ctx.preferredName,
          riskLevel,
          summaryFallback: summary,
          history: [],
          moodCheckIn: mood,
        })
      } catch (regenError) {
        console.error('[youth-ai-chat] recordMood profile regen failed:', (regenError as Error).message)
      }

      return jsonResponse({
        reply,
        summary,
        riskLevel,
        crisisDetected,
        escalationNeeded,
        escalationResources: [],
        staffName: chatCtx.staffName,
        insights: null,
        insightsSyncError: null,
        model,
      })
    }

    if (action === 'sendMessage') {
      const { sessionId, message } = body
      const trimmed = String(message || '').trim()
      if (!trimmed) return jsonResponse({ error: 'Message is required' }, 400)

      let chatCtx: ChatContext = {
        preferredName: ctx.preferredName,
        staffName: null,
        lastOfflineSummary: null,
        recentAiSummary: null,
        latestChange: null,
      }

      try {
        await client.database.from('ai_messages').insert([
          { session_id: sessionId, youth_id: ctx.youth.id, sender: 'youth', message: trimmed },
        ])

        const { data: history, error: historyError } = await client.database
          .from('ai_messages')
          .select('sender, message')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(20)

        if (historyError) throw historyError

        chatCtx = await fetchChatContext(client, ctx.youth.id, ctx.preferredName)
        const chatMessages = buildChatMessagesFromHistory(history || [], trimmed, chatCtx)

        let reply = buildQuickFallbackReply(trimmed)
        let summary = buildStaffSummaryFromMessage(trimmed)
        let riskLevel = inferRiskForChatTurn(history || [], trimmed) || 'low'
        let crisisDetected = false
        let escalationNeeded = false
        let model = 'local-fallback'
        let replySource = 'fallback'
        let aiParsed: { riskLevel?: string; crisisDetected?: boolean; escalationNeeded?: boolean } = {}

        try {
          let aiResult = await callChatGptWithTimeout(chatMessages, 'chat', 20000)
          let parsed = aiResult.parsed
          aiParsed = parsed
          let candidate = String(parsed.reply || '').trim()

          if (isReplyTooShort(trimmed, candidate) || isGenericShortReply(candidate)) {
            console.warn('[youth-ai-chat] ChatGPT reply too short or generic, retrying once')
            const retryMessages = [
              ...chatMessages,
              {
                role: 'user',
                content:
                  `${trimmed}\n\n[Please rewrite: reply in the SAME language as the youth, 120+ words if English or 200+ Chinese characters, with • bullet suggestions and warm depth — not a short generic answer.]`,
              },
            ]
            aiResult = await callChatGptWithTimeout(retryMessages, 'chat-retry', 12000)
            parsed = aiResult.parsed
            candidate = String(parsed.reply || '').trim()
          }

          if (
            candidate.length >= 20 &&
            !isReplyTooShort(trimmed, candidate) &&
            !isGenericShortReply(candidate) &&
            !replyContradictsUserMessage(trimmed, candidate)
          ) {
            reply = finalizeReply(trimmed, candidate)
            model = aiResult.model
            replySource = 'chatgpt'
          } else if (candidate.length >= 20 && replyContradictsUserMessage(trimmed, candidate)) {
            console.warn('[youth-ai-chat] ChatGPT reply contradicted user message, using fallback')
            reply = finalizeReply(trimmed, buildQuickFallbackReply(trimmed))
            model = 'chatgpt-contradiction-fallback'
            replySource = 'fallback'
            riskLevel = inferRiskForChatTurn(history || [], trimmed)
          } else {
            console.warn('[youth-ai-chat] ChatGPT reply still too short, using fallback')
            reply = finalizeReply(trimmed, buildQuickFallbackReply(trimmed))
            model = 'chatgpt-short-fallback'
            replySource = 'fallback'
            riskLevel = inferRiskForChatTurn(history || [], trimmed)
          }
          summary = parsed.summary || buildStaffSummaryFromMessage(trimmed)
          const parsedRisk = ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low'
          riskLevel = pickHigherRisk(riskLevel, parsedRisk)
        } catch (chatError) {
          console.error('[youth-ai-chat] sendMessage ChatGPT failed, using fallback:', chatError.message)
          reply = finalizeReply(trimmed, buildQuickFallbackReply(trimmed))
          replySource = 'fallback'
          riskLevel = inferRiskForChatTurn(history || [], trimmed)
          aiParsed = {}
        }

        if (isCasualPositiveMessage(trimmed)) {
          riskLevel = 'low'
          aiParsed = { riskLevel: 'low', crisisDetected: false, escalationNeeded: false }
        }

        ;({ riskLevel, crisisDetected, escalationNeeded } = normalizeSafetyAssessment(riskLevel, aiParsed))

        await client.database.from('ai_messages').insert([
          { session_id: sessionId, youth_id: ctx.youth.id, sender: 'ai', message: reply },
        ])

        await client.database.from('ai_chat_sessions').update({
          ai_summary: summary,
          risk_level: riskLevel,
          ...(crisisDetected ? { crisis_detected: true } : {}),
        }).eq('id', sessionId)

        try {
          await saveSessionCrisisFlag(client, sessionId, { riskLevel, crisisDetected })
          await saveQuickRiskLevelOnly(client, ctx.youth.id, riskLevel, crisisDetected)
        } catch (riskError) {
          console.error('[youth-ai-chat] sendMessage risk update failed:', (riskError as Error).message)
        }

        try {
          await finishSessionAfterReply(client, {
            sessionId,
            youthId: ctx.youth.id,
            preferredName: ctx.preferredName,
            riskLevel,
            summaryFallback: summary,
            history: [...(history || []), { sender: 'ai', message: reply }],
          })
        } catch (regenError) {
          console.error('[youth-ai-chat] sendMessage profile regen failed:', (regenError as Error).message)
        }

        return jsonResponse({
          reply,
          summary,
          riskLevel,
          crisisDetected,
          escalationNeeded,
          escalationResources: [],
          staffName: chatCtx.staffName,
          insights: null,
          insightsSyncError: null,
          model,
          replySource,
        })
      } catch (sendError) {
        console.error('[youth-ai-chat] sendMessage fatal, returning fallback:', sendError.message)
        const reply = buildQuickFallbackReply(trimmed)
        const fallbackRisk = isCasualPositiveMessage(trimmed)
          ? 'low'
          : inferRiskForChatTurn([{ sender: 'youth', message: trimmed }], trimmed)
        const { riskLevel: finalRisk, crisisDetected, escalationNeeded } = normalizeSafetyAssessment(
          fallbackRisk,
          {},
        )
        try {
          await client.database.from('ai_messages').insert([
            { session_id: sessionId, youth_id: ctx.youth.id, sender: 'ai', message: reply },
          ])
        } catch (insertError) {
          console.error('[youth-ai-chat] fallback insert failed:', insertError.message)
        }
        return jsonResponse({
          reply,
          summary: 'Youth checked in with AI companion (fallback).',
          riskLevel: finalRisk,
          crisisDetected,
          escalationNeeded,
          escalationResources: [],
          staffName: chatCtx.staffName,
          model: 'local-fallback',
        })
      }
    }

    if (action === 'greeting') {
      const chatCtx = await fetchChatContext(client, ctx.youth.id, ctx.preferredName)
      let reply = `Hi ${ctx.preferredName}, I'm here with you tonight.`

      try {
        const { parsed } = await callChatGpt(
          [
            { role: 'system', content: buildChatSystemPrompt(chatCtx, 'greeting') },
            { role: 'user', content: 'Generate today\'s opening greeting for this youth.' },
          ],
          'greeting',
        )
        reply = parsed.reply || reply
      } catch (greetingError) {
        console.error('[youth-ai-chat] greeting AI failed:', greetingError.message)
      }

      return jsonResponse({ reply, staffName: chatCtx.staffName, model: CHAT_MODEL })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (error) {
    return jsonResponse({ error: error.message || 'Server error' }, error.message === 'Unauthorized' ? 401 : 500)
  }
}
