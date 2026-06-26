/**
 * Invoke youth-ai-chat repairYouthInsights with project API key (server-side).
 */
import { readFileSync } from 'node:fs'

const YOUTH_ID = '381cb57d-2e74-4c21-912c-fdb827961771'
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

  console.log('Repair response:', JSON.stringify(payload, null, 2))
  const summary = payload?.insights?.overall_summary || payload?.overall_summary
  console.log('has_summary:', Boolean(String(summary || '').trim()))
}

main().catch((error) => {
  console.error('Invoke failed:', error.message || error)
  process.exit(1)
})
