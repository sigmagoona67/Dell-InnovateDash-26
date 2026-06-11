import { Link } from 'react-router-dom'
import RiskBadge from './RiskBadge'

export default function AssignedYouthCard({ youth }) {
  return (
    <Link
      to={`/staff-dashboard/youth/${youth.id}`}
      className="group block rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-sky-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 group-hover:text-sky-700">{youth.name}</h3>
          <div className="mt-2">
            <RiskBadge level={youth.riskLevel} />
          </div>
        </div>
        {youth.hasNew && (
          <span className="rounded-full bg-sky-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
            New
          </span>
        )}
      </div>
    </Link>
  )
}
