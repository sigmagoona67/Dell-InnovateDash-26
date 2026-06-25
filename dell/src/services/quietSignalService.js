import { buildDriftSeries, computeQuietSignal } from '../lib/quietSignal'
import { buildQuietSignalCaseload } from '../lib/quietSignalMockData'

// Returns the youth whose Quiet Signal is trending up (watch/amber only —
// steady youth never surface, so the worker isn't flooded). Highest drift first.
//
// P1 runs on the seeded demo caseload through the real scorer, so the panel
// demos with zero backend dependency. To go live (P2), replace `loadCaseload`
// with a fetch of assigned youths + their last-14-days ai_messages/ai_chat_sessions
// (readable via the staff-read-access RLS policy) — the rest is unchanged.
async function loadCaseload() {
  return buildQuietSignalCaseload(new Date())
}

export async function getCaseloadDrift() {
  try {
    const now = new Date()
    const caseload = await loadCaseload()

    const scored = caseload.map((youth) => {
      const result = computeQuietSignal(youth, { now })
      return {
        youthId: youth.id,
        youthName: youth.name,
        explicitRisk: youth.explicitRisk, // contrast: explicit per-message risk
        score: result.score,
        tier: result.tier,
        signals: result.signals,
        window: result.window,
        series: buildDriftSeries(youth, { now }),
      }
    })

    return scored
      .filter((y) => y.tier !== 'steady')
      .sort((a, b) => b.score - a.score)
  } catch {
    return []
  }
}
