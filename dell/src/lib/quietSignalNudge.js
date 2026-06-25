import { computeQuietSignal } from './quietSignal'

// Decide whether to surface the youth-side JITAI nudge.
// Fires only when the Quiet Signal is amber AND it's the late-night window —
// the moment the evidence (distress peaks at night) says matters most.
//
// Prefers a persisted drift tier (from P2) if given; otherwise computes it
// client-side from the youth's own recent messages/sessions.
export function shouldShowNudge({
  messages = [],
  sessions = [],
  driftTier,
  now = new Date(),
  lateAfterHour = 21,
} = {}) {
  const tier = driftTier || computeQuietSignal({ messages, sessions }, { now }).tier
  const hour = new Date(now).getHours()
  const isLate = hour >= lateAfterHour || hour < 5
  return tier === 'amber' && isLate
}
