import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { StatusPill } from '../ui'

function CapacityMeter({ count, target }) {
  const pct = Math.min(100, Math.round((count / Math.max(target, 1)) * 100))
  const over = count > target
  const barTone = over ? 'bg-danger-600' : pct >= 80 ? 'bg-warning-500' : 'bg-sky-500'

  return (
    <div>
      <div className="flex items-center justify-between text-[12px] font-medium text-slate-500">
        <span>Capacity</span>
        <span>
          {count}/{target}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-pill bg-slate-100"
        role="img"
        aria-label={`Caseload ${count} of ${target} target${over ? ', over capacity' : ''}`}
      >
        <div className={`h-full rounded-pill ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function RiskMixBar({ mix }) {
  const total = (mix.high || 0) + (mix.medium || 0) + (mix.low || 0)
  if (!total) {
    return <p className="text-[12px] font-medium text-slate-400">No risk data yet</p>
  }

  const segs = [
    { key: 'high', n: mix.high || 0, tone: 'bg-danger-600', label: 'High' },
    { key: 'medium', n: mix.medium || 0, tone: 'bg-warning-500', label: 'Medium' },
    { key: 'low', n: mix.low || 0, tone: 'bg-success-600', label: 'Low' },
  ]

  return (
    <div>
      <p className="text-[12px] font-medium text-slate-500">Risk mix</p>
      <div
        className="mt-1.5 flex h-2 w-full overflow-hidden rounded-pill bg-slate-100"
        role="img"
        aria-label={`Risk mix: ${mix.high || 0} high, ${mix.medium || 0} medium, ${mix.low || 0} low`}
      >
        {segs
          .filter((s) => s.n > 0)
          .map((s) => (
            <div key={s.key} className={s.tone} style={{ width: `${(s.n / total) * 100}%` }} />
          ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium text-slate-500">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${s.tone}`} />
            {s.label} {s.n}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function StaffTeamCard({ member }) {
  const initials = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

  return (
    <Link
      to={`/staff-dashboard/team/${member.id}`}
      className="group block rounded-card border border-slate-200 bg-white p-6 shadow-card transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 motion-safe:hover:shadow-card-hover"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-sky-50 font-display text-[15px] font-semibold text-sky-600">
          {initials || 'S'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[18px] font-semibold text-ink-800">{member.name}</h3>
            {member.isSelf && (
              <span className="rounded-pill bg-sky-50 px-2.5 py-1 text-[12px] font-semibold text-sky-600">
                You
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-slate-500">{member.email}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <CapacityMeter count={member.assignedYouthCount} target={member.capacityTarget || 8} />
        <RiskMixBar mix={member.riskMix || { high: 0, medium: 0, low: 0 }} />
      </div>

      <div className="mt-4">
        {member.quizCompleted ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-success-100 px-2.5 py-1 text-[12px] font-semibold text-success-600">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Profile complete
          </span>
        ) : (
          <StatusPill status="incomplete">Profile incomplete</StatusPill>
        )}
      </div>
    </Link>
  )
}
