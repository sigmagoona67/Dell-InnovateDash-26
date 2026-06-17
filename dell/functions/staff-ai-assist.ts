import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MODELS = [
  'google/gemini-2.5-flash',
  'openai/gpt-chat-latest',
  'anthropic/claude-sonnet-4.6',
]

const STAFF_SUMMARY_PROMPT = `You are an AI assistant helping youth workers summarise offline counselling sessions.

Combine the previous long-term understanding with the new transcript.
Return ONLY valid JSON:
{
  "ai_summary": "concise session summary",
  "emotion_analysis": ["emotion1", "emotion2"],
  "categories": ["category1", "category2"],
  "risk_level": "low | medium | high",
  "main_risk": ["risk1", "risk2"],
  "best_communication_approach": ["approach1", "approach2"],
  "latest_change": "what changed since last understanding",
  "suggested_follow_up": "recommended follow-up action",
  "current_state": ["state1", "state2"]
}`

const STAFF_QUIZ_PROMPTS = {
  staff_interests: `You help youth workers refine connection interests during staff onboarding.
Given their free-text input, suggest 4-6 specific tags (1-4 words) for topics/hobbies they use to connect with young people.
Do not repeat selected or previousSuggestions.
Return ONLY valid JSON: { "suggestions": ["tag1", "tag2"] }`,
  staff_communication: `You help youth workers describe their communication approach with young people.
Suggest 4-6 specific communication style tags (2-6 words each).
Do not repeat selected or previousSuggestions.
Return ONLY valid JSON: { "suggestions": ["tag1", "tag2"] }`,
  staff_strengths: `You help youth workers identify their supporting strengths when working with young people.
Suggest 4-6 specific strength tags (2-6 words each).
Do not repeat selected or previousSuggestions.
Return ONLY valid JSON: { "suggestions": ["tag1", "tag2"] }`,
}

const COMPATIBILITY_PROMPT = `You are an AI matching assistant for a youth mental wellness platform.
Compare a youth worker's profile quiz with a youth's onboarding questionnaire.
Score how well they may work together from 0-100 based on:
- shared interests and connection points
- personality complement and alignment
- communication style fit (what youth wants vs how staff communicates)
- staff strengths relative to youth challenges

Be realistic and humane. Never claim certainty. Return ONLY valid JSON:
{
  "score": 0,
  "summary": "2-3 sentence explanation of the match",
  "matchPoints": ["point1", "point2"],
  "considerations": ["consideration1"]
}`

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

async function getStaffQuestionnaire(client, staffId) {
  const { data, error } = await client.database
    .from('staff_questionnaire')
    .select('*')
    .eq('staff_id', staffId)
    .maybeSingle()

  if (error) throw error
  return data
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
          temperature: 0.4,
          response_format: { type: 'json_object' },
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

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const client = getClient(req)
    const staffCtx = await getStaffContext(client)
    const body = await req.json()

    if (body.action === 'suggestStaffQuizOptions') {
      const { category, input, selected = [], previousSuggestions = [] } = body
      if (!input?.trim()) return jsonResponse({ error: 'Input is required' }, 400)
      if (!STAFF_QUIZ_PROMPTS[category]) return jsonResponse({ error: 'Invalid category' }, 400)

      const parsed = await callOpenRouter([
        { role: 'system', content: STAFF_QUIZ_PROMPTS[category] },
        {
          role: 'user',
          content: JSON.stringify({
            input: input.trim(),
            selected,
            previousSuggestions,
          }),
        },
      ])

      const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
      const exclude = new Set(
        [...selected, ...previousSuggestions].map((item) => String(item).toLowerCase()),
      )
      const suggestions = rawSuggestions
        .map((item) => String(item).trim())
        .filter(Boolean)
        .filter((item) => !exclude.has(item.toLowerCase()))
        .slice(0, 6)

      return jsonResponse({ suggestions })
    }

    if (body.action === 'compatibilityScore') {
      const { youthQuestionnaire, youthName = 'Youth' } = body
      if (!youthQuestionnaire) return jsonResponse({ error: 'Youth questionnaire is required' }, 400)

      const staffQuestionnaire = await getStaffQuestionnaire(client, staffCtx.profile.id)
      if (!staffQuestionnaire?.quiz_completed) {
        return jsonResponse({ error: 'Complete your staff profile quiz first' }, 400)
      }

      const parsed = await callOpenRouter([
        { role: 'system', content: COMPATIBILITY_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            youthName,
            staffProfile: {
              interests: staffQuestionnaire.interests,
              personality: staffQuestionnaire.personality,
              preferred_communication_style: staffQuestionnaire.preferred_communication_style,
              supporting_strengths: staffQuestionnaire.supporting_strengths,
              additional_notes: staffQuestionnaire.additional_notes,
            },
            youthProfile: youthQuestionnaire,
          }),
        },
      ])

      const score = Math.max(0, Math.min(100, Number(parsed?.score) || 0))
      return jsonResponse({
        score,
        summary: parsed?.summary || 'Compatibility assessed based on profile overlap.',
        matchPoints: Array.isArray(parsed?.matchPoints) ? parsed.matchPoints : [],
        considerations: Array.isArray(parsed?.considerations) ? parsed.considerations : [],
      })
    }

    if (body.action !== 'generateOfflineSummary') {
      return jsonResponse({ error: 'Unknown action' }, 400)
    }

    const { transcript, previousInsights = {}, youthName = 'Youth' } = body
    if (!transcript?.trim()) {
      return jsonResponse({ error: 'Transcript is required' }, 400)
    }

    const messages = [
      { role: 'system', content: STAFF_SUMMARY_PROMPT },
      {
        role: 'user',
        content: `Youth name: ${youthName}\nPrevious insights: ${JSON.stringify(previousInsights)}\nNew offline counselling transcript:\n${transcript}`,
      },
    ]

    const result = await callOpenRouter(messages)
    return jsonResponse(result)
  } catch (error) {
    return jsonResponse({ error: error.message || 'Server error' }, error.message === 'Unauthorized' ? 401 : 500)
  }
}
