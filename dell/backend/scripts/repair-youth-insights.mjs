/**
 * Repair ai_dynamic_insights risk/crisis flags from existing chat sessions.
 * Usage: CAREBRIDGE_API_URL=http://localhost:3016 node scripts/repair-youth-insights.mjs [youthId]
 */
import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge'
const youthIdArg = process.argv[2]

const CRISIS_RE = /想自杀|自杀|不想活|自伤|suicide|kill myself|hurt myself|want to die|self.?harm/i
const HIGH_RE = /霸凌|bully|扔东西|欺负|跟踪|hitting|hit me|abuse|打/i
const MEDIUM_RE = /吵架|压力|难过|sad|stress|stressed|崩溃|overwhelm|anxious/i

function inferRisk(text) {
  if (CRISIS_RE.test(text)) return 'high'
  if (HIGH_RE.test(text)) return 'high'
  if (MEDIUM_RE.test(text)) return 'medium'
  return 'low'
}

function pickHigher(a, b) {
  const order = { low: 0, medium: 1, high: 2 }
  return (order[a] ?? 0) >= (order[b] ?? 0) ? a : b
}

async function repairYouth(client, youthId, preferredName) {
  const { rows: messages } = await client.query(
    `SELECT message FROM public.ai_messages WHERE youth_id = $1 AND sender = 'youth' ORDER BY created_at`,
    [youthId],
  )
  const { rows: sessions } = await client.query(
    `SELECT risk_level, crisis_detected FROM public.ai_chat_sessions WHERE youth_id = $1`,
    [youthId],
  )

  const corpus = messages.map((m) => m.message).join(' ')
  let risk = inferRisk(corpus)
  let crisis = CRISIS_RE.test(corpus)
  for (const s of sessions) {
    if (s.risk_level) risk = pickHigher(risk, s.risk_level)
    if (s.crisis_detected) crisis = true
  }

  const { rows: existing } = await client.query(
    `SELECT id, risk_level, crisis_detected FROM public.ai_dynamic_insights WHERE youth_id = $1`,
    [youthId],
  )

  if (!existing.length) {
    await client.query(
      `INSERT INTO public.ai_dynamic_insights
        (youth_id, risk_level, crisis_detected, last_crisis_at, current_state, main_risk, best_communication_approach, latest_change, overall_summary)
       VALUES ($1, $2, $3, $4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '', '')`,
      [youthId, risk, crisis, crisis ? new Date().toISOString() : null],
    )
    console.log(`  inserted insights for ${preferredName || youthId}: risk=${risk} crisis=${crisis}`)
    return
  }

  const row = existing[0]
  const nextRisk = pickHigher(row.risk_level || 'low', risk)
  const nextCrisis = Boolean(row.crisis_detected) || crisis
  await client.query(
    `UPDATE public.ai_dynamic_insights
     SET risk_level = $2,
         crisis_detected = $3,
         last_crisis_at = CASE WHEN $3 AND last_crisis_at IS NULL THEN NOW() ELSE last_crisis_at END,
         updated_at = NOW()
     WHERE youth_id = $1`,
    [youthId, nextRisk, nextCrisis],
  )
  console.log(`  updated insights for ${preferredName || youthId}: risk=${nextRisk} crisis=${nextCrisis}`)
}

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()
  try {
    let youths
    if (youthIdArg) {
      youths = (
        await client.query(
          `SELECT yp.id, yp.preferred_name FROM public.youth_profiles yp WHERE yp.id = $1`,
          [youthIdArg],
        )
      ).rows
    } else {
      youths = (
        await client.query(
          `SELECT DISTINCT yp.id, yp.preferred_name
           FROM public.youth_profiles yp
           JOIN public.ai_messages m ON m.youth_id = yp.id
           ORDER BY yp.preferred_name`,
        )
      ).rows
    }

    if (!youths.length) {
      console.log('[repair-youth-insights] no youths with chat messages found')
      return
    }

    console.log(`[repair-youth-insights] repairing ${youths.length} youth(s)...`)
    for (const youth of youths) {
      await repairYouth(client, youth.id, youth.preferred_name)
    }
    console.log('[repair-youth-insights] done')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[repair-youth-insights]', err.message)
  process.exit(1)
})
