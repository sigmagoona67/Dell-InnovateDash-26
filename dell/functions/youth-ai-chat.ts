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

const SYSTEM_PROMPT = `You are CareBridge AI, a supportive after-hours companion for youths.

Your role is to provide warm, calm, non-judgmental emotional support.
You are not a therapist, doctor, counsellor, or replacement for a youth worker.

You should:
- listen actively
- validate feelings
- ask gentle follow-up questions
- encourage healthy coping methods
- remind the youth that their assigned youth worker can follow up later

You must not:
- diagnose mental illness
- provide medical advice
- encourage harmful behaviour
- promise secrecy for serious safety risks

If the youth mentions immediate danger, self-harm, abuse, violence, or serious risk:
- respond supportively
- encourage contacting emergency services, a trusted adult, or their assigned youth worker
- mark riskLevel as high

Return ONLY valid JSON with this shape:
{
  "reply": "AI reply to youth",
  "summary": "short summary of the latest message/session",
  "riskLevel": "low | medium | high"
}`

const MOOD_REPLIES = {
  Good: "I'm glad to hear you're feeling good today. What's been going well for you?",
  Okay: "Thank you for checking in. I'm here with you — would you like to talk about your day?",
  Sad: "Thank you for sharing that. It's okay to feel sad sometimes. I'm here with you. Would you like to talk about what's on your mind?",
  Stressed: "Thank you for sharing that. It sounds like today may feel heavy. I'm here with you. Would you like to talk about what made you feel stressed?",
  Overwhelmed: "That sounds really tough. Thank you for trusting me with how you feel. We can take this one step at a time — I'm here with you.",
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

async function getYouthContext(client) {
  const { data: userData, error: userError } = await client.auth.getCurrentUser()
  if (userError || !userData?.user?.id) {
    throw new Error('Unauthorized')
  }

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
    user: userData.user,
    profile,
    youth,
    preferredName: youth.preferred_name || profile.display_name || profile.email.split('@')[0],
  }
}

async function callOpenRouterJson(messages) {
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
          temperature: 0.5,
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

const ONBOARDING_PROMPTS = {
  interests: `You help youths refine their interests during onboarding for a youth mental wellness app.
Given their free-text input, suggest 4-6 specific, concise interest tags (1-4 words each) they might identify with.
Do not repeat items from selected or previousSuggestions.
Keep suggestions age-appropriate, positive, and specific (e.g. "Basketball" not just "Sports").
Return ONLY valid JSON: { "suggestions": ["tag1", "tag2"] }`,
  communication: `You help youths identify preferred communication styles for support from youth workers.
Given their free-text description, suggest 4-6 specific communication preference tags (2-6 words each).
Do not repeat items from selected or previousSuggestions.
Examples: "Patient listener", "Gentle encouragement", "Practical advice", "Light humour".
Return ONLY valid JSON: { "suggestions": ["tag1", "tag2"] }`,
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
          temperature: 0.7,
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

      const parsed = JSON.parse(content)
      return {
        reply: parsed.reply || 'I am here with you. Would you like to share more?',
        summary: parsed.summary || 'Youth checked in with AI companion.',
        riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low',
        model,
      }
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
    const ctx = await getYouthContext(client)
    const body = await req.json()
    const { action } = body

    if (action === 'recordMood') {
      const { sessionId, mood } = body
      const reply = MOOD_REPLIES[mood] || MOOD_REPLIES.Okay

      await client.database.from('ai_chat_sessions').update({
        mood_check_in: mood,
        ai_summary: `Youth mood check-in: ${mood}`,
        risk_level: mood === 'Overwhelmed' ? 'medium' : 'low',
      }).eq('id', sessionId)

      await client.database.from('ai_messages').insert([
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'youth', message: `I'm feeling ${mood} today.` },
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'system', message: `Mood check-in: ${mood}` },
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'ai', message: reply },
      ])

      return jsonResponse({ reply, summary: `Youth mood check-in: ${mood}`, riskLevel: mood === 'Overwhelmed' ? 'medium' : 'low' })
    }

    if (action === 'sendMessage') {
      const { sessionId, message } = body
      if (!message?.trim()) return jsonResponse({ error: 'Message is required' }, 400)

      await client.database.from('ai_messages').insert([
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'youth', message: message.trim() },
      ])

      const { data: history, error: historyError } = await client.database
        .from('ai_messages')
        .select('sender, message')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20)

      if (historyError) throw historyError

      const chatMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((row) => ({
          role: row.sender === 'youth' ? 'user' : 'assistant',
          content: row.message,
        })),
      ]

      const aiResult = await callOpenRouter(chatMessages)

      await client.database.from('ai_messages').insert([
        { session_id: sessionId, youth_id: ctx.youth.id, sender: 'ai', message: aiResult.reply },
      ])

      await client.database.from('ai_chat_sessions').update({
        ai_summary: aiResult.summary,
        risk_level: aiResult.riskLevel,
      }).eq('id', sessionId)

      return jsonResponse(aiResult)
    }

    if (action === 'greeting') {
      const greetings = [
        `Hi ${ctx.preferredName}, I'm here with you tonight.`,
        `I'm glad you're here today, ${ctx.preferredName}. How has your day been?`,
        `It's nice to see you again, ${ctx.preferredName}. Would you like to talk about today?`,
      ]
      const reply = greetings[Math.floor(Math.random() * greetings.length)]
      return jsonResponse({ reply })
    }

    if (action === 'suggestOnboardingOptions') {
      const { category, input, selected = [], previousSuggestions = [] } = body
      if (!input?.trim()) return jsonResponse({ error: 'Input is required' }, 400)
      if (!ONBOARDING_PROMPTS[category]) return jsonResponse({ error: 'Invalid category' }, 400)

      const parsed = await callOpenRouterJson([
        { role: 'system', content: ONBOARDING_PROMPTS[category] },
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

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (error) {
    return jsonResponse({ error: error.message || 'Server error' }, error.message === 'Unauthorized' ? 401 : 500)
  }
}
