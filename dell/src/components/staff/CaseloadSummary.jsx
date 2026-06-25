import { Users, ShieldAlert, BellRing, Hourglass } from 'lucide-react'
import { Card } from '../ui'

/**
 * Triage summary row for the staff Home. Four stat tiles so the page
 * reads as a worklist at a glance, not a flat name grid.
 * Risk/alert tiles use restrained accent tints, never alarming.
 */
function Tile({ icon: Icon, label, value, tint, emphatic = false }) {
  return (
    <Card padding="sm" className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${tint}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p
          className={`font-display text-[22px] font-bold leading-none ${
            emphatic ? 'text-danger-700' : 'text-ink-800'
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-[13px] font-medium text-slate-500">{label}</p>
      </div>
    </Card>
  )
}

export default function CaseloadSummary({
  caseloadCount = 0,
  highRiskCount = 0,
  openAlerts = 0,
  awaitingFollowUp = 0,
}) {
  return (
    <section aria-label="Caseload summary" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        icon={Users}
        label="My caseload"
        value={caseloadCount}
        tint="bg-sky-50 text-sky-600"
      />
      <Tile
        icon={ShieldAlert}
        label="High risk"
        value={highRiskCount}
        tint="bg-danger-100 text-danger-700"
        emphatic={highRiskCount > 0}
      />
      <Tile
        icon={BellRing}
        label="Open alerts"
        value={openAlerts}
        tint="bg-danger-100 text-danger-700"
        emphatic={openAlerts > 0}
      />
      <Tile
        icon={Hourglass}
        label="Awaiting follow-up"
        value={awaitingFollowUp}
        tint="bg-status-violet-100 text-status-violet-500"
      />
    </section>
  )
}
