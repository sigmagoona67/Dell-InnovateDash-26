import { RISK_LABELS } from '../../lib/staffMockData'

export default function RiskBadge({ level, showEmoji = true }) {
  const config = RISK_LABELS[level] || RISK_LABELS.low

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${config.className}`}
    >
      {showEmoji && <span aria-hidden="true">{config.emoji}</span>}
      {config.label}
    </span>
  )
}
