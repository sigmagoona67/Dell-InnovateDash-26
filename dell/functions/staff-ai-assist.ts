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
    await getStaffContext(client)
    const body = await req.json()

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
