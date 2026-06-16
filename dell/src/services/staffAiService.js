import { enrichOfflineSummary, finalizeOfflineSessionSummary, synthesizeOfflineSummary } from '../lib/offlineSummaryParser'
import { extractYouthSpeech } from '../lib/sessionCaseNote'
import { requireInsforge, requireInsforgeLongRunning } from '../lib/insforgeClient'

function clipTranscript(transcript) {
  const text = String(transcript || '').trim()
  if (text.length <= 12000) return text
  return `${text.slice(0, 12000)}\n\n[Transcript truncated for AI processing]`
}

export async function generateOfflineSummary(payload) {
  const clipped = clipTranscript(payload.transcript)
  const youthSpeech = extractYouthSpeech(clipped).join('\n')

  try {
    const { data, error } = await requireInsforgeLongRunning().functions.invoke('staff-ai-assist', {
      body: {
        action: 'generateOfflineSummary',
        ...payload,
        transcript: clipped,
        youthSpeech,
      },
    })

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    return finalizeOfflineSessionSummary(
      enrichOfflineSummary(data, clipped, {
        youthName: payload.youthName,
        previousInsights: payload.previousInsights,
        questionnaire: payload.questionnaire,
      }),
    )
  } catch {
    return buildMockOfflineSummary(
      clipped,
      payload.previousInsights,
      payload.youthName,
      payload.questionnaire,
    )
  }
}

export function buildMockOfflineSummary(transcript, previousInsights = {}, youthName, questionnaire = null) {
  return synthesizeOfflineSummary(transcript, { youthName, previousInsights, questionnaire })
}

export async function regenerateYouthProfileInsights(youthId, payload = {}) {
  const { data, error } = await requireInsforge().functions.invoke('staff-ai-assist', {
    body: {
      action: 'regenerateYouthInsights',
      youthId,
      summary: payload.summary || '',
      riskLevel: payload.riskLevel || 'low',
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
