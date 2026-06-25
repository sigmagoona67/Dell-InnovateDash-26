import { Link } from 'react-router-dom'
import { RiskBadge, StatusPill } from '../ui'

export default function TeamYouthCard({ youth, linkToDetail = false }) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3
          className={`font-display text-[18px] font-semibold text-ink-800 ${
            linkToDetail ? 'group-hover:text-sky-600' : ''
          }`}
        >
          {youth.name}
        </h3>
        <div className="mt-2">
          <RiskBadge level={youth.riskLevel} showBar={youth.riskLevel === 'high'} />
        </div>
      </div>
      {!youth.onboardingCompleted && <StatusPill status="onboarding">Onboarding</StatusPill>}
    </div>
  )

  if (linkToDetail) {
    return (
      <Link
        to={`/staff-dashboard/youth/${youth.id}`}
        className="group block rounded-card border border-slate-200 bg-white p-5 shadow-card transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 motion-safe:hover:shadow-card-hover"
      >
        {content}
      </Link>
    )
  }

  return (
    <article className="rounded-card border border-slate-200 bg-white p-5 shadow-card">{content}</article>
  )
}
