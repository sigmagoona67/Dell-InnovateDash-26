import { UserMinus, Clock, WifiOff, FileWarning, CircleDot } from 'lucide-react'

/**
 * Operational status ONLY (Unassigned / Onboarding / Offline / Incomplete).
 * Violet family — visually distinct from RiskBadge, NEVER amber.
 */
const STATUS_ICON = {
  unassigned: UserMinus,
  onboarding: Clock,
  offline: WifiOff,
  incomplete: FileWarning,
}

export default function StatusPill({ status, className = '', children }) {
  const label = children ?? status
  const key = typeof status === 'string' ? status.toLowerCase().trim() : ''
  const Icon = STATUS_ICON[key] || CircleDot

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill bg-status-violet-100 px-2.5 py-1 text-[13px] font-medium text-status-violet-500 ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
