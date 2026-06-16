const RISK_ORDER = { low: 0, medium: 1, high: 2 }

export function pickHighestRisk(...levels) {
  let best = 'low'
  const flat = levels.flat().filter(Boolean)
  for (const level of flat) {
    const normalized = String(level).toLowerCase()
    if (!['low', 'medium', 'high'].includes(normalized)) continue
    if ((RISK_ORDER[normalized] ?? 0) > (RISK_ORDER[best] ?? 0)) best = normalized
  }
  return best
}

export function inferRiskFromMessages() {
  return 'low'
}
