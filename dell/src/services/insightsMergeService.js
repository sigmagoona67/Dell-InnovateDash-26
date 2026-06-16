import { mergeDynamicProfileForPersist } from '../lib/dynamicProfile'
import { mergeLivingInsights } from '../lib/livingMemory'

export function mergeOfflineIntoInsights(existing, generated, context = {}) {
  const prev = existing || {}
  const gen = generated || {}

  const offlineSessions =
    context.offlineSessions || (context.transcript ? [{ transcript: context.transcript }] : [])

  const latest_change = gen.latest_change || ''

  const fallback = {
    current_state: gen.current_state || [],
    risk_level: gen.risk_level,
    main_risk: gen.main_risk || [],
    best_communication_approach: gen.best_communication_approach || [],
    latest_change,
    overall_summary: gen.overall_summary || '',
    dynamic_profile: gen.dynamic_profile,
    morning_brief: gen.morning_brief,
  }

  const merged = mergeLivingInsights({
    previous: prev,
    generated: gen,
    fallback,
    context: {
      youthName: context.youthName,
      messages: context.messages || [],
      offlineSessions,
      dynamicProfile: mergeDynamicProfileForPersist({
        savedProfile: prev.dynamic_profile,
        generatedProfile: gen.dynamic_profile,
        questionnaire: context.questionnaire,
      }),
      questionnaire: context.questionnaire,
      aiSessions: context.aiSessions || [],
    },
  })

  return {
    ...merged,
    dynamic_profile: mergeDynamicProfileForPersist({
      savedProfile: prev.dynamic_profile,
      generatedProfile: merged.dynamic_profile,
      questionnaire: context.questionnaire,
    }),
  }
}
