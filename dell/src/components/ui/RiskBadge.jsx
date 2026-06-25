import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react'

/**
 * Risk reads by WEIGHT + SHAPE + LABEL, never color or emoji alone.
 * high   = solid danger fill + optional left accent bar
 * medium = soft amber chip
 * low    = soft success chip
 */
const LEVELS = {
  high: {
    label: 'High risk',
    Icon: ShieldAlert,
    chip: 'bg-danger-600 text-white',
    bar: 'bg-danger-700',
  },
  medium: {
    label: 'Medium risk',
    Icon: AlertTriangle,
    chip: 'bg-warning-100 text-warning-500',
    bar: 'bg-warning-500',
  },
  low: {
    label: 'Low risk',
    Icon: ShieldCheck,
    chip: 'bg-success-100 text-success-600',
    bar: 'bg-success-600',
  },
}

export default function RiskBadge({ level = 'low', showBar = false, className = '' }) {
  const cfg = LEVELS[level] || LEVELS.low
  const { Icon } = cfg

  return (
    <span
      role="status"
      aria-label={cfg.label}
      className={`relative inline-flex items-center gap-1.5 overflow-hidden rounded-pill ${showBar ? 'pl-3' : 'px-2.5'} ${showBar ? 'pr-2.5' : ''} py-1 text-[13px] font-bold ${cfg.chip} ${className}`}
    >
      {showBar && (
        <span aria-hidden="true" className={`absolute left-0 top-0 h-full w-1 ${cfg.bar}`} />
      )}
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  )
}
