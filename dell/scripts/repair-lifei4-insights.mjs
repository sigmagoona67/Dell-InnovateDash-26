/**
 * One-shot repair: seed ai_dynamic_insights for Lifei4 from existing chat/session data.
 * Uses project admin API key (server-side only).
 */
import { readFileSync } from 'node:fs'
import { createAdminClient } from '@insforge/sdk'

const YOUTH_ID = '381cb57d-2e74-4c21-912c-fdb827961771'

function loadProject() {
  const raw = readFileSync(new URL('../.insforge/project.json', import.meta.url), 'utf8')
  return JSON.parse(raw)
}

function buildBundle({ preferredName, youthSpeech, sessionSummary }) {
  const corpus = [youthSpeech, sessionSummary].filter(Boolean).join(' ')
  const interests = []
  const personality = []
  const coping_methods = []

  if (/bird|leaf|flower|nature|park|collect/i.test(corpus)) {
    interests.push('Nature observation', 'Bird watching')
    coping_methods.push('Bird watching and collecting leaves')
    personality.push('Quiet and observant')
  }
  if (/headphone|music/i.test(corpus)) {
    coping_methods.push('Using headphones to block out the world')
  }
  if (/aquarium|jellyfish/i.test(corpus)) {
    interests.push('Aquarium videos')
    coping_methods.push('Watching calming jellyfish videos')
  }

  const overall_summary =
    sessionSummary?.trim() ||
    `${preferredName} has been engaging with the after-hours AI companion. Recent conversations suggest emotional strain and a preference for quiet, solitary calming routines.`

  return {
    overall_summary,
    dynamic_profile: {
      interests: [...new Set(interests)],
      personality: [...new Set(personality)],
      living_arrangement: '',
      coping_methods: [...new Set(coping_methods)],
    },
    current_state: ['Emotionally strained', 'Seeking solitude'],
    main_risk: ['Withdrawal under stress'],
    best_communication_approach: [
      'Approach gently without pressure to talk',
      'Validate nature-based coping routines before problem-solving',
    ],
    latest_change: youthSpeech
      ? `Latest share: "${youthSpeech.slice(0, 160)}${youthSpeech.length > 160 ? '…' : ''}"`
      : 'Profile generated from saved session summary.',
    risk_level: 'low',
  }
}

async function main() {
  const project = loadProject()
  const baseUrl = project.oss_host
  const apiKey = project.api_key

  const admin = createAdminClient({ baseUrl, apiKey })

  const [{ data: youth }, { data: messages }, { data: sessions }, { data: existing }] = await Promise.all([
    admin.database.from('youth_profiles').select('id, preferred_name').eq('id', YOUTH_ID).maybeSingle(),
    admin.database
      .from('ai_messages')
      .select('sender, message')
      .eq('youth_id', YOUTH_ID)
      .order('created_at', { ascending: true }),
    admin.database
      .from('ai_chat_sessions')
      .select('ai_summary')
      .eq('youth_id', YOUTH_ID)
      .order('session_date', { ascending: false })
      .limit(1),
    admin.database.from('ai_dynamic_insights').select('id').eq('youth_id', YOUTH_ID).maybeSingle(),
  ])

  if (!youth) throw new Error('Lifei4 youth profile not found')

  const youthSpeech = (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter((line) => line && !/^i'm feeling /i.test(line))
    .join('\n')

  const sessionSummary = String(sessions?.[0]?.ai_summary || '').trim()
  const bundle = buildBundle({
    preferredName: youth.preferred_name || 'Lifei4',
    youthSpeech,
    sessionSummary,
  })

  let saved
  if (existing?.id) {
    const { data, error } = await admin.database
      .from('ai_dynamic_insights')
      .update(bundle)
      .eq('youth_id', YOUTH_ID)
      .select('*')
      .single()
    if (error) throw error
    saved = data
    console.log('Updated existing insights row:', saved.id)
  } else {
    const { data, error } = await admin.database
      .from('ai_dynamic_insights')
      .insert([{ youth_id: YOUTH_ID, ...bundle }])
      .select('*')
      .single()
    if (error) throw error
    saved = data
    console.log('Inserted new insights row:', saved.id)
  }

  console.log('overall_summary:', Boolean(saved.overall_summary?.trim()))
  console.log('dynamic_profile:', JSON.stringify(saved.dynamic_profile))
  console.log('updated_at:', saved.updated_at)
}

main().catch((error) => {
  console.error('Repair failed:', error.message || error)
  process.exit(1)
})
