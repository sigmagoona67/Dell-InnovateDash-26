import { createClient } from '../backend/lib/createClient.js'

// Keep in sync with functions/shared/profileBundlePrompts.ts
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

7) current_concern — ONE short sentence, 5–15 words. The single most important issue requiring youth worker attention RIGHT NOW. Not a full case summary. No source attribution.

8) case_preview — 2–3 short sentences, approximately 30–60 words. Dashboard card preview. Main concern + key behavioural patterns + meaningful coping if relevant. NOT At a Glance. No source attribution.

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

Return ONLY valid JSON: { "overall_summary": "one paragraph" }`

const BANNED_AT_A_GLANCE_PATTERNS = [
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

function atAGlanceWordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function isAtAGlanceQuality(text) {
  const value = String(text || '').trim()
  if (!value) return false
  if (/[\u4e00-\u9fff]/.test(value)) return false
  const words = atAGlanceWordCount(value)
  if (words < 40 || words > 280) return false
  if (BANNED_AT_A_GLANCE_PATTERNS.some((p) => p.test(value))) return false
  return true
}

function isAtAGlanceRuleFallback(text) {
  const value = String(text || '').trim()
  if (!value) return false
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
  return AT_A_GLANCE_RULE_FALLBACK_PATTERNS.some((p) => p.test(value))
}

function hasLockedAtAGlanceQuality(text) {
  return isAtAGlanceQuality(text) && !isAtAGlanceRuleFallback(text)
}

function preserveQualityAtAGlance(saved, generated) {
  const savedText = String(saved || '').trim()
  const genText = String(generated || '').trim()
  if (hasLockedAtAGlanceQuality(genText)) return genText
  if (hasLockedAtAGlanceQuality(savedText)) return savedText
  if (isAtAGlanceQuality(genText)) return genText
  if (isAtAGlanceQuality(savedText)) return savedText
  return genText || savedText
}

function buildAtAGlanceStaffPayload({
  preferredName,
  questionnaire,
  existing,
  messages,
  sessions,
  offlineSessions,
  dynamicProfile,
  careInsights,
}) {
  const youthSpeech = youthLines(messages).join('\n')
  const sessionSummaries = [
    ...(sessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...(offlineSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]
  const offlineTranscriptSample = (offlineSessions || [])
    .map((s) => String(s.transcript || '').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)

  return {
    youthName: preferredName || 'This youth',
    youthSpeechSample: youthSpeech.slice(0, 5000),
    sessionSummaries: sessionSummaries.slice(0, 8),
    offlineTranscriptSample,
    moodHistory: (sessions || []).map((s) => s.mood_check_in).filter(Boolean),
    recentMood: (sessions || []).find((s) => s.mood_check_in)?.mood_check_in || null,
    dynamicProfile: dynamicProfile || existing?.dynamic_profile || {
      interests: [],
      personality: [],
      living_arrangement: '',
      coping_methods: [],
    },
    careInsights: careInsights || {
      current_state: existing?.current_state || [],
      main_risk: existing?.main_risk || [],
      best_communication_approach: existing?.best_communication_approach || [],
      latest_change: existing?.latest_change || '',
    },
    existingOverallSummary: String(existing?.overall_summary || '').trim(),
    questionnaireBackground: questionnaire || null,
  }
}

async function generateAtAGlanceForStaff(payload) {
  const hasSignal =
    Boolean(String(payload.youthSpeechSample || '').trim()) ||
    (payload.sessionSummaries || []).length > 0 ||
    Boolean(String(payload.offlineTranscriptSample || '').trim()) ||
    (payload.dynamicProfile?.interests || []).length > 0 ||
    (payload.questionnaireBackground?.interests || []).length > 0

  if (!hasSignal) return ''

  try {
    const result = await callOpenRouter([
      { role: 'system', content: AT_A_GLANCE_PROMPT },
      { role: 'user', content: JSON.stringify(payload) },
    ])
    const summary = String(result?.overall_summary || '').trim()
    if (isAtAGlanceQuality(summary)) return summary
  } catch (error) {
    console.error('[staff-ai-assist] at-a-glance AI failed:', (error as Error).message)
  }

  return ''
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MODELS = [
  'anthropic/claude-sonnet-4.6',
  'openai/gpt-chat-latest',
  'google/gemini-2.5-flash',
]

const STAFF_SUMMARY_PROMPT = `You are a youth social worker assistant analysing an offline counselling session transcript.

Return ONLY valid JSON with this shape:
{
  "ai_summary": "",
  "dynamic_profile": {
    "interests": [],
    "personality": [],
    "living_arrangement": "",
    "coping_methods": []
  },
  "emotion_analysis": [],
  "categories": [],
  "risk_level": "low",
  "main_risk": [],
  "best_communication_approach": [],
  "suggested_follow_up": "",
  "current_state": [],
  "latest_change": ""
}

ai_summary — session case note for staff:
- One English paragraph, 55–130 words, 2+ sentences
- Social-work case impression: presentation, themes, risk, coping, follow-up need
- Do NOT use: "The youth discussed", "The youth shared", "The conversation focused on", "Continued monitoring is recommended"
- Observation-based, professional, neutral

dynamic_profile — AI's CURRENT understanding of this youth (regenerate from scratch):
STATIC vs DYNAMIC:
- staticProfile in context is questionnaire-only (how youth describes themselves). NEVER modify or copy it verbatim into dynamic_profile unless you add NEW meaningful context.
- Example: static "Music" + transcript shows nightly piano for calm → interests: "Piano music", "Listening to music for emotional regulation" — NOT "Music".
- Missing static must NOT block dynamic generation.

Regenerate fully:
- Review existingDynamicProfile, transcript, previousInsights, and ALL context.
- Re-evaluate every existing dynamic label: Keep, Update, Refine, Replace, or Remove.
- Do NOT append blindly. Output the FULL latest dynamic understanding.
- Open vocabulary only — no keyword lists or fixed categories.

Dynamic fields (illustrative examples only):
- interests, personality, living_arrangement, coping_methods

Do NOT put preferred_communication_style or current_challenges in dynamic_profile.

Other fields:

current_state (1–3 items): how the youth appears RIGHT NOW.
main_risk (1–3 items): most important issue(s) currently affecting wellbeing.
best_communication_approach (1–5 items): practical staff interaction suggestions.
latest_change (1–2 sentences): meaningful insight from THIS session only — not a conversation summary. Do NOT use "The youth discussed", "During this session".

risk_level, emotion_analysis, categories, suggested_follow_up, current_state: infer from session when supported; use empty when unsure.`

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

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function normalizeQuestionnaire(row) {
  if (!row) return null
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

function youthLines(messages = []) {
  return (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter(Boolean)
}

async function getStaffContext(client) {
  const { data: userData, error: userError } = await client.auth.getCurrentUser()
  if (userError || !userData?.user?.id) throw new Error('Unauthorized')

  const { data: profile, error: profileError } = await client.database
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile || profile.role !== 'staff') throw new Error('Only staff accounts can use this function')

  return { user: userData.user, profile }
}

function staffEditedAt(meta, key) {
  return Boolean(meta && meta[key])
}

function buildStaffEditedSourcesFromContext(existing, sessions = [], offlineSessions = []) {
  const sources = {}
  const meta = existing?.staff_edited_fields || {}

  if (staffEditedAt(meta, 'overall_summary') && String(existing?.overall_summary || '').trim()) {
    sources.overall_summary = String(existing.overall_summary).trim()
  }
  if (staffEditedAt(meta, 'current_state') && (existing?.current_state || []).length) {
    sources.current_state = existing.current_state
  }
  if (staffEditedAt(meta, 'main_risk') && (existing?.main_risk || []).length) {
    sources.main_risk = existing.main_risk
  }
  if (staffEditedAt(meta, 'best_communication_approach') && (existing?.best_communication_approach || []).length) {
    sources.best_communication_approach = existing.best_communication_approach
  }
  if (staffEditedAt(meta, 'latest_change') && String(existing?.latest_change || '').trim()) {
    sources.latest_change = String(existing.latest_change).trim()
  }

  const dynamic = existing?.dynamic_profile || {}
  const dynamicEdits = {}
  for (const key of ['interests', 'personality', 'preferred_communication_style', 'living_arrangement', 'current_challenges', 'coping_methods']) {
    if (!staffEditedAt(meta, `dynamic_profile.${key}`)) continue
    const value = dynamic[key]
    if (Array.isArray(value) ? value.length : String(value || '').trim()) dynamicEdits[key] = value
  }
  if (Object.keys(dynamicEdits).length) sources.dynamic_profile = dynamicEdits

  const chatSummaries = (sessions || [])
    .filter((s) => staffEditedAt(s.staff_edited_fields, 'ai_summary') && String(s.ai_summary || '').trim())
    .map((s) => ({ session_date: s.session_date, ai_summary: String(s.ai_summary).trim() }))
  if (chatSummaries.length) sources.chatSessionSummaries = chatSummaries

  const offlineSummaries = (offlineSessions || [])
    .filter((s) => staffEditedAt(s.staff_edited_fields, 'ai_summary') && String(s.ai_summary || '').trim())
    .map((s) => ({ session_date: s.session_date, ai_summary: String(s.ai_summary).trim() }))
  if (offlineSummaries.length) sources.offlineSessionSummaries = offlineSummaries

  return Object.keys(sources).length ? sources : null
}

async function fetchYouthInsightContext(client, youthId) {
  const [
    { data: youth, error: youthError },
    { data: messages, error: msgError },
    { data: sessions, error: sessError },
    { data: offlineSessions, error: offlineError },
    { data: questionnaireRow, error: questionnaireError },
    { data: existing },
  ] = await Promise.all([
    client.database.from('youth_profiles').select('id, preferred_name').eq('id', youthId).maybeSingle(),
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

  if (youthError) throw youthError
  if (!youth) throw new Error('Youth not found')
  if (msgError) throw msgError
  if (sessError) throw sessError
  if (offlineError) throw offlineError
  if (questionnaireError) throw questionnaireError

  return {
    youth,
    messages: messages || [],
    sessions: sessions || [],
    offlineSessions: offlineSessions || [],
    questionnaire: normalizeQuestionnaire(questionnaireRow),
    existing,
  }
}

async function upsertInsights(client, youthId, merged, staffProfileId) {
  const writeClient = getServiceClient()
  const row = {
    ...merged,
    updated_by: staffProfileId,
    approved_at: new Date().toISOString(),
  }

  const attempt = async (payload) => {
    const { data: existing } = await writeClient.database
      .from('ai_dynamic_insights')
      .select('id')
      .eq('youth_id', youthId)
      .maybeSingle()

    if (existing) {
      const { data, error } = await writeClient.database
        .from('ai_dynamic_insights')
        .update(payload)
        .eq('youth_id', youthId)
        .select('*')
        .single()
      if (error) throw error
      return data
    }

    const { data, error } = await writeClient.database
      .from('ai_dynamic_insights')
      .insert([{ youth_id: youthId, ...payload }])
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  try {
    return await attempt(row)
  } catch (error) {
    const msg = String(error?.message || '')
    if (!/dynamic_profile|morning_brief|schema cache|column/i.test(msg)) throw error
    const { dynamic_profile: _dp, morning_brief: _mb, ...core } = row
    return await attempt(core)
  }
}

async function callOpenRouter(messages) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  let lastError = null
  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: PROFILE_GENERATION_TEMPERATURE,
          response_format: { type: 'json_object' },
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        lastError = new Error(`OpenRouter ${model}: ${response.status}`)
        continue
      }

      const payload = await response.json()
      const content = payload?.choices?.[0]?.message?.content
      if (!content) {
        lastError = new Error(`OpenRouter ${model}: empty response`)
        continue
      }

      return JSON.parse(content)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('All AI models failed')
}

function buildBaselineSummary(preferredName, youthSpeech, sessionSummaries) {
  const corpus = [youthSpeech, ...sessionSummaries].filter(Boolean).join(' ').trim()
  if (!corpus) return ''

  const name = preferredName || 'This youth'
  const themes = []
  if (/bird|leaf|flower|nature|park|collect/i.test(corpus)) themes.push('quiet nature-based activities')
  if (/headphone|music|piano|guitar|aquarium|jellyfish/i.test(corpus)) themes.push('sensory or immersive calming routines')
  if (/sister|family|parent|home/i.test(corpus)) themes.push('family dynamics')
  if (/sad|stress|overwhelm|anxious|quiet|withdraw/i.test(corpus)) themes.push('emotional strain and a need for calm')
  if (/exam|school|study/i.test(corpus)) themes.push('school-related pressure')

  const themeText = themes.length
    ? themes.slice(0, 3).join(', ')
    : 'personal experiences shared in recent contacts'

  return `${name} presents as a young person whose recent contacts suggest ${themeText}. They appear to be navigating day-to-day stress while relying on personally meaningful routines to restore a sense of calm. Staff should approach gently, validate their coping strategies, and explore what currently feels most overwhelming. Follow-up should focus on understanding their present emotional state and what support would feel safest right now.`
}

function buildRuleBasedBundle(preferredName, youthSpeech, sessionSummaries) {
  const corpus = [youthSpeech, ...sessionSummaries].filter(Boolean).join(' ').trim()
  const interests: string[] = []
  const personality: string[] = []
  const coping_methods: string[] = []
  const current_state: string[] = []
  const main_risk: string[] = []
  const best_communication_approach: string[] = []

  if (/bird|leaf|flower|nature|park|collect/i.test(corpus)) {
    interests.push('Nature observation')
    coping_methods.push('Bird watching and collecting leaves')
    personality.push('Quiet and observant')
  }
  if (/headphone|music|piano|guitar/i.test(corpus)) {
    interests.push('Music')
    coping_methods.push('Listening to music with headphones')
  }
  if (/aquarium|jellyfish|fish tank/i.test(corpus)) {
    interests.push('Aquarium videos')
    coping_methods.push('Watching calming aquarium videos')
  }
  if (/sister|family|parent|home|grandparent/i.test(corpus)) {
    personality.push('Family-oriented')
  }
  if (/sad|stress|overwhelm|anxious|quiet|withdraw|alone/i.test(corpus)) {
    current_state.push('Emotionally strained')
    main_risk.push('Withdrawal under stress')
    best_communication_approach.push('Approach gently and validate feelings before problem-solving')
  }
  if (/exam|school|study|homework/i.test(corpus)) {
    main_risk.push('Academic pressure')
    best_communication_approach.push('Ask what feels most overwhelming about school right now')
  }
  if (/health|symptom|doctor|reassur|anxious|check/i.test(corpus)) {
    main_risk.push('Health-related anxiety')
    current_state.push('Frequently seeking reassurance')
    coping_methods.push('Observing weather patterns')
  }
  if (!best_communication_approach.length) {
    best_communication_approach.push('Use calm, non-judgmental language and let them set the pace')
  }

  const latestSnippet = youthSpeech.split('\n').filter(Boolean).slice(-1)[0] || sessionSummaries.slice(-1)[0] || ''
  const latest_change = latestSnippet
    ? `Recent contact suggests they are processing personal stress while relying on calming routines. Last shared: "${latestSnippet.slice(0, 120)}${latestSnippet.length > 120 ? '…' : ''}"`
    : ''

  const overall_summary = buildBaselineSummary(preferredName, youthSpeech, sessionSummaries)
  const primaryRisk = main_risk[0] || current_state[0] || 'Ongoing emotional strain'
  let current_concern = 'Emotional strain affecting day-to-day functioning.'
  if (/health/i.test(primaryRisk)) current_concern = 'Health anxiety and emotional regulation difficulties.'
  else if (/withdraw|isolat/i.test(primaryRisk)) current_concern = 'Increasing social withdrawal and emotional isolation.'
  else if (/academic/i.test(primaryRisk)) current_concern = 'Persistent academic stress affecting daily functioning.'

  const previewParts = []
  if (/health|symptom|reassur/i.test(corpus)) {
    previewParts.push('Frequently worries about physical symptoms and seeks reassurance despite medical advice.')
  } else if (/sad|stress|overwhelm/i.test(corpus)) {
    previewParts.push('Carries noticeable emotional strain and often withdraws when overwhelmed.')
  }
  if (/weather|cloud|bird|nature|aquarium|headphone/i.test(corpus)) {
    previewParts.push('Quiet sensory routines have become an important way to restore calm during anxious periods.')
  } else if (coping_methods.length) {
    previewParts.push(`${coping_methods[0]} has become a meaningful calming routine during difficult periods.`)
  }
  const case_preview = previewParts.slice(0, 2).join(' ') || `${current_concern} Further detail will build as contacts continue.`

  return {
    overall_summary,
    dynamic_profile: {
      interests: [...new Set(interests)],
      personality: [...new Set(personality)],
      living_arrangement: /sister|parent|family/i.test(corpus) ? 'Living with family' : '',
      coping_methods: [...new Set(coping_methods)],
    },
    current_state: current_state.length ? current_state : ['Engaging with support'],
    main_risk: main_risk.length ? main_risk : ['Needs further assessment'],
    best_communication_approach,
    latest_change,
    current_concern,
    case_preview,
  }
}

async function regenerateYouthProfileInsights(client, youthId, staffProfileId) {
  const { youth, messages, sessions, offlineSessions, questionnaire, existing } =
    await fetchYouthInsightContext(client, youthId)

  const youthSpeech = youthLines(messages).join('\n')
  const sessionSummaries = [
    ...(sessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
    ...(offlineSessions || []).map((s) => String(s.ai_summary || '').trim()).filter(Boolean),
  ]

  if (!youthSpeech && !sessionSummaries.length) {
    throw new Error('No youth chat or session content to generate profile from')
  }

  const preferredName = String(youth.preferred_name || 'Youth').trim() || 'Youth'
  const atAGlancePayload = buildAtAGlanceStaffPayload({
    preferredName,
    questionnaire,
    existing,
    messages,
    sessions,
    offlineSessions,
  })

  let result
  try {
    result = await callOpenRouter([
      { role: 'system', content: FULL_PROFILE_BUNDLE_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          youthName: preferredName,
          staticProfile: questionnaire,
          existingDynamicProfile: existing?.dynamic_profile || {
            interests: [],
            personality: [],
            living_arrangement: '',
            coping_methods: [],
          },
          existingCareInsights: {
            current_state: existing?.current_state || [],
            main_risk: existing?.main_risk || [],
            best_communication_approach: existing?.best_communication_approach || [],
            latest_change: existing?.latest_change || '',
          },
          youthSpeechSample: youthSpeech.slice(0, 5000),
          sessionSummaries: sessionSummaries.slice(0, 8),
          moodHistory: (sessions || []).map((s) => s.mood_check_in).filter(Boolean),
          atAGlanceContext: atAGlancePayload,
          staffEditedSources: buildStaffEditedSourcesFromContext(existing, sessions, offlineSessions),
        }),
      },
    ])
  } catch (aiError) {
    console.error('[staff-ai-assist] AI bundle failed, using baseline:', (aiError as Error).message)
    result = buildRuleBasedBundle(preferredName, youthSpeech, sessionSummaries)
  }

  const careInsights = {
    current_state: asArray(result.current_state),
    main_risk: asArray(result.main_risk),
    best_communication_approach: asArray(result.best_communication_approach),
    latest_change: String(result.latest_change || '').trim(),
  }

  let overall_summary = await generateAtAGlanceForStaff(
    buildAtAGlanceStaffPayload({
      preferredName,
      questionnaire,
      existing,
      messages,
      sessions,
      offlineSessions,
      dynamicProfile: result.dynamic_profile,
      careInsights,
    }),
  )

  if (!overall_summary) {
    overall_summary = String(result.overall_summary || '').trim()
  }
  if (!hasLockedAtAGlanceQuality(overall_summary)) {
    overall_summary = buildBaselineSummary(preferredName, youthSpeech, sessionSummaries)
  }
  overall_summary = preserveQualityAtAGlance(existing?.overall_summary, overall_summary)

  if (!String(overall_summary || '').trim()) {
    const baseline = buildRuleBasedBundle(preferredName, youthSpeech, sessionSummaries)
    result = { ...baseline, ...result, overall_summary: baseline.overall_summary }
    overall_summary = String(baseline.overall_summary || '').trim()
  }

  const merged = {
    overall_summary: String(overall_summary || '').trim(),
    dynamic_profile: result.dynamic_profile || {
      interests: [],
      personality: [],
      living_arrangement: '',
      coping_methods: [],
    },
    current_state: asArray(result.current_state),
    main_risk: asArray(result.main_risk),
    best_communication_approach: asArray(result.best_communication_approach),
    latest_change: String(result.latest_change || '').trim(),
    current_concern: String(result.current_concern || '').trim(),
    case_preview: String(result.case_preview || '').trim(),
    risk_level: existing?.risk_level || 'low',
    staff_edited_fields: existing?.staff_edited_fields || {},
  }

  try {
    const saved = await upsertInsights(client, youthId, merged, staffProfileId)
    console.log('[staff-ai-assist] profile regen saved for', youthId)
    return saved
  } catch (upsertError) {
    const msg = String((upsertError as Error).message || '')
    if (/policy|permission|row-level|RLS|42501/i.test(msg)) {
      throw new Error(
        'Database permission denied writing ai_dynamic_insights. Run migrations/20260610600000_staff-insights-write-pending-youth.sql in InsForge SQL Editor, then retry.',
      )
    }
    throw upsertError
  }
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
    const { profile: staffProfile } = await getStaffContext(client)
    const body = await req.json()

    if (body.action === 'regenerateYouthInsights') {
      const { youthId } = body
      if (!youthId) return jsonResponse({ error: 'youthId required' }, 400)
      const insights = await regenerateYouthProfileInsights(client, youthId, staffProfile.id)
      return jsonResponse({ ok: true, insights })
    }

    if (body.action !== 'generateOfflineSummary') {
      return jsonResponse({ error: 'Unknown action' }, 400)
    }

    const { transcript, youthSpeech = '', previousInsights = {}, youthName = 'Youth', questionnaire = null } = body
    if (!transcript?.trim()) {
      return jsonResponse({ error: 'Transcript is required' }, 400)
    }

    const youthText = String(youthSpeech || '').trim() || transcript
    const staticProfile = questionnaire
      ? {
          interests: questionnaire.interests || [],
          personality: questionnaire.personality || [],
          preferred_communication_style: questionnaire.preferred_communication_style || [],
          living_arrangement: questionnaire.living_arrangement || '',
          current_challenges: questionnaire.current_challenges || [],
          coping_methods: questionnaire.coping_methods || [],
        }
      : null

    const messages = [
      { role: 'system', content: STAFF_SUMMARY_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          youthName,
          staticProfile,
          existingDynamicProfile: previousInsights?.dynamic_profile || {
            interests: [],
            personality: [],
            living_arrangement: '',
            coping_methods: [],
          },
          previousInsights,
          youthSpeechSample: youthText.slice(0, 8000),
        }),
      },
    ]

    const result = await callOpenRouter(messages)
    return jsonResponse(result)
  } catch (error) {
    return jsonResponse({ error: error.message || 'Server error' }, error.message === 'Unauthorized' ? 401 : 500)
  }
}
