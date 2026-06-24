import { Link } from 'react-router-dom'
import RiskBadge from './RiskBadge'

export default function TeamYouthCard({ youth, linkToDetail = false }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-lg font-bold text-slate-800 ${linkToDetail ? 'group-hover:text-sky-700' : ''}`}>
            {youth.name}
          </h3>
          <div className="mt-2">
            <RiskBadge level={youth.riskLevel} />
          </div>
        </div>
        {!youth.onboardingCompleted && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            Onboarding
          </span>
        )}
      </div>
    </>
  )

  if (linkToDetail) {
    return (
      <Link
        to={`/staff-dashboard/youth/${youth.id}`}
        className="group block rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-sky-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        {content}
      </Link>
    )
  }

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      {content}
    </article>
  )
}
