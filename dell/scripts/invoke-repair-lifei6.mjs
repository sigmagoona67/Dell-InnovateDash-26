/**
 * Invoke youth-ai-chat repairYouthInsights for Lifei6 (locked At a Glance + Care Insights regen).
 */
import { readFileSync } from 'node:fs'

const YOUTH_ID = '4360da5e-cacb-4c6a-915f-e447a17cb47d'
const FN_URL = 'https://qav4stmn.functions.insforge.app/youth-ai-chat'

function loadApiKey() {
  const project = JSON.parse(readFileSync(new URL('../.insforge/project.json', import.meta.url), 'utf8'))
  return project.api_key
}

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  const apiKey = loadApiKey()

  const response = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      action: 'repairYouthInsights',
      youthId: YOUTH_ID,
      riskLevel: 'low',
    }),
  })

  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    console.error('HTTP', response.status, payload)
    process.exit(1)
  }

  const insights = payload?.insights || payload
  const summary = insights?.overall_summary || ''
  const care = {
    current_state: insights?.current_state,
    main_risk: insights?.main_risk,
    best_communication_approach: insights?.best_communication_approach,
    latest_change: insights?.latest_change,
  }
  console.log('overall_summary (first 200):', String(summary).slice(0, 200))
  console.log('care:', JSON.stringify(care, null, 2))
  console.log('has_locked_glance:', !/\bpresents as a young person\b/i.test(summary))
  console.log('has_care:', Boolean(care.current_state?.length || care.main_risk?.length))
}

main().catch((error) => {
  console.error('Invoke failed:', error.message || error)
  process.exit(1)
})
