import { Link } from 'react-router-dom'
import { Clock, ChevronRight } from 'lucide-react'
import { RiskBadge } from '../ui'

/**
 * Triage card: risk first, then last-contact + a one-line state so the
 * caseload reads as a worklist rather than a flat name grid.
 */
export default function AssignedYouthCard({ youth }) {
  const isHigh = youth.riskLevel === 'high'

  return (
    <Link
      to={`/staff-dashboard/youth/${youth.id}`}
      className={`group block rounded-card border bg-white p-5 shadow-card transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 motion-safe:hover:shadow-card-hover ${
        isHigh ? 'border-danger-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[18px] font-semibold text-ink-800">{youth.name}</h3>
        {youth.hasNew && (
          <span className="rounded-pill bg-sky-50 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-sky-600">
            New
          </span>
        )}
      </div>

      <div className="mt-2">
        <RiskBadge level={youth.riskLevel} showBar={isHigh} />
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-snug text-slate-600">
        {youth.stateLine || 'No recent change noted'}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 text-[12px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Last contact {youth.lastContactLabel || 'unknown'}
        </span>
        <ChevronRight
          className="h-4 w-4 text-slate-400 transition-colors group-hover:text-sky-500"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
