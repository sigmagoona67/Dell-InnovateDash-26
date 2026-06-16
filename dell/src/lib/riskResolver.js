import { inferRiskFromMessages, pickHighestRisk } from './riskInference.js'

export { pickHighestRisk } from './riskInference.js'

/**
 * Staff-facing risk: highest of persisted insights, live transcript, and session records.
 */
export function resolveYouthRiskLevel({
  insights,
  aiSessions = [],
  offlineSessions = [],
  messages = [],
} = {}) {
  const fromTranscript = inferRiskFromMessages(messages)

  const sessionLevels = []
  for (const session of aiSessions || []) {
    if (session.risk_level) sessionLevels.push(session.risk_level)
  }
  for (const session of offlineSessions || []) {
    if (session.status === 'draft') continue
    if (session.risk_level) sessionLevels.push(session.risk_level)
  }

  return pickHighestRisk(insights?.risk_level, fromTranscript, sessionLevels)
}
