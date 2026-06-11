import { requireInsforge } from '../lib/insforgeClient'

export async function generateOfflineSummary(payload) {
  const { data, error } = await requireInsforge().functions.invoke('staff-ai-assist', {
    body: { action: 'generateOfflineSummary', ...payload },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export function buildMockOfflineSummary(transcript, previousInsights = {}) {
  const snippet = transcript.slice(0, 120)
  return {
    ai_summary: `Counselling session summary: ${snippet}${transcript.length > 120 ? '…' : ''}`,
    emotion_analysis: ['Reflective', 'Anxious', 'Hopeful'],
    categories: ['Emotional support', 'Coping strategies'],
    risk_level: previousInsights.risk_level || 'medium',
    main_risk: previousInsights.main_risk?.length
      ? previousInsights.main_risk
      : ['Ongoing stress', 'Sleep disruption'],
    best_communication_approach: previousInsights.best_communication_approach?.length
      ? previousInsights.best_communication_approach
      : ['Use gentle questions', 'Validate feelings before problem-solving'],
    latest_change: 'Updated after offline counselling transcript review',
    suggested_follow_up: 'Check in within 24–48 hours and monitor sleep patterns.',
    current_state: previousInsights.current_state?.length
      ? previousInsights.current_state
      : ['Processing recent stress', 'Open to support'],
  }
}
