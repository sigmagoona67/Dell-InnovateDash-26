import { Link } from 'react-router-dom'
import RiskBadge from './RiskBadge'

export default function AssignedYouthCard({ youth }) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-slate-900">{youth.nameLine || youth.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RiskBadge level={youth.riskLevel} />
            {youth.hasNew && (
              <span className="rounded-full bg-sky-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                NEW
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Current State</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{youth.currentStateDisplay}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Latest Interaction Insight</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{youth.latestInteractionInsight}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{youth.lastActivityLabel || 'Last Update'}</p>
          <p className="mt-1 text-sm text-slate-600">{youth.lastActivityDisplay || '—'}</p>
        </div>
      </div>

      <div className="mt-5 pt-1">
        <Link
          to={`/staff-dashboard/youth/${youth.id}`}
          className="inline-flex rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Open Profile
        </Link>
      </div>
    </article>
  )
}
