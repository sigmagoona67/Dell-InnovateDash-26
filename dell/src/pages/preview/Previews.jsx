// Auth-free preview routes for screenshots / demos. These render the REAL
// components with seeded mock data so they can be captured without a login.
// Not linked anywhere in the product nav.
import CaseloadSummary from '../../components/staff/CaseloadSummary'
import QuietSignalPanel from '../../components/staff/QuietSignalPanel'
import StaffNav from '../../components/staff/StaffNav'
import UrgentAlertsPanel from '../../components/staff/UrgentAlertsPanel'
import MicroInterventionCard from '../../components/youth/MicroInterventionCard'
import MoodHeatmap from '../../components/youth/MoodHeatmap'
import { buildMoodYearMock } from '../../lib/moodHeatmap'

const MOCK_ALERTS = [
  {
    id: 'a1',
    youthId: 'demo-jordan',
    youthName: 'Jordan L.',
    riskLevel: 'high',
    aiSummary:
      'Expressed thoughts of not wanting to be here during an after-hours chat. Crisis line shown; needs same-day follow-up.',
    triggerMessage: "i don't want to be here anymore",
    status: 'open',
    isPendingYouth: false,
    createdAtLabel: 'Today, 11:52 PM',
  },
]

const noop = () => {}

function StaffFrame({ children }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>
      <StaffNav />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-10">{children}</div>
    </div>
  )
}

export function StaffPreview() {
  return (
    <StaffFrame>
      <header className="mb-6">
        <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">Staff Portal</p>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">
          Staff Dashboard
        </h1>
        <p className="mt-2 text-[15px] text-slate-600">Welcome back, Aisha. Your caseload at a glance.</p>
      </header>
      <CaseloadSummary caseloadCount={9} highRiskCount={1} openAlerts={1} awaitingFollowUp={2} />
      <UrgentAlertsPanel
        alerts={MOCK_ALERTS}
        onAcknowledge={noop}
        onResolve={noop}
        busyId=""
        onAssign={noop}
        assigningId=""
      />
      <QuietSignalPanel />
    </StaffFrame>
  )
}

export function QuietSignalPreview() {
  return (
    <StaffFrame>
      <header className="mb-6">
        <p className="text-[12px] font-medium uppercase tracking-wide text-warning-500">
          Feature spotlight
        </p>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">
          The Quiet Signal
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
          Early-warning from how a youth writes and whether they engage — before they say anything
          explicit. Every signal is explainable.
        </p>
      </header>
      <QuietSignalPanel />
    </StaffFrame>
  )
}

export function MoodHeatmapPreview() {
  const entries = buildMoodYearMock(new Date())
  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50 px-6 py-12">
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-[12px] font-medium uppercase tracking-wide text-teal-600">Feature spotlight</p>
          <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">
            A year in moods
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            Each day graded by mood + AI sentiment. The drift is visible at a glance — the grid cools
            and thins out in the final weeks, right before the Quiet Signal fires.
          </p>
        </header>
        <MoodHeatmap
          entriesByDate={entries}
          title="Maya’s year in check-ins"
          subtitle="Warmer squares are heavier days; teal are brighter ones; grey means no check-in."
        />
      </div>
    </div>
  )
}

export function YouthJitaiPreview() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-b from-teal-50 via-white to-sky-50 px-6 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-sky-50 blur-3xl" />
      </div>
      <div className="relative z-10">
        <MicroInterventionCard name="Maya" timeLabel="11:42 PM" onBreathe={noop} onTalk={noop} onDismiss={noop} />
      </div>
    </div>
  )
}
