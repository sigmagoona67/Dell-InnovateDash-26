const RISK_ORDER = { low: 0, medium: 1, high: 2 }

const CRISIS_TEXT_RE = /想自杀|自杀|不想活|自伤|suicide|kill myself|hurt myself|want to die|self.?harm/i
const HIGH_RISK_TEXT_RE = /霸凌|bully|扔东西|欺负|跟踪|跟着我|stalk|盯着我|hitting|hit me|abuse|打/i
const MEDIUM_RISK_TEXT_RE = /吵架|压力|难过|sad|stress|stressed|崩溃|overwhelm|anxious|受不了|撑不住/i

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

export function inferRiskFromText(text = '') {
  const value = String(text || '')
  if (CRISIS_TEXT_RE.test(value)) return 'high'
  if (HIGH_RISK_TEXT_RE.test(value)) return 'high'
  if (MEDIUM_RISK_TEXT_RE.test(value)) return 'medium'
  return 'low'
}

export function inferRiskFromMessages(messages = []) {
  const youthText = (messages || [])
    .filter((m) => m.sender === 'youth' || m.role === 'user')
    .map((m) => String(m.message || m.text || '').trim())
    .filter(Boolean)
    .join(' ')
  return inferRiskFromText(youthText)
}
