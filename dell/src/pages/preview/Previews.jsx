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

// Mirrors the youth ChatHistoryPanel heatmap card (expanded state): 90-day
// window, reframed copy, "Want to talk now?" action — phone-width frame.
export function MoodYouthPreview() {
  const entries = buildMoodYearMock(new Date())
  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-teal-50 via-white to-sky-50 px-6 py-12">
      <div className="relative z-10 mx-auto max-w-xl">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-teal-600">
          Youth · History tab (consensus design)
        </p>
        <section className="rounded-card border border-slate-200 bg-white shadow-card">
          <div className="p-5 sm:p-6">
            <MoodHeatmap
              entriesByDate={entries}
              weeks={13}
              tooltipMode="warm"
              showCount={false}
              title="Every time you reached out"
              subtitle="Each square is a day you checked in — that took something. Quieter days and brighter days are all part of your story, and grey just means a day off. Rest is okay."
              legendLow="quieter day"
              legendHigh="brighter day"
              noCheckInLabel="a day off — that's okay"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-teal-700 underline-offset-2">See my whole year</span>
              <span className="text-[13px] font-medium text-slate-400">Close</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-card bg-teal-50 px-4 py-3">
              <p className="text-[14px] text-teal-800">Want to talk now?</p>
              <span className="shrink-0 rounded-pill bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white">
                Talk to your companion
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// Mirrors the staff CaseTimelineTab heatmap section: full 53-week clinical
// fidelity, drift-bound subtitle, right-edge scroll fade.
export function MoodStaffPreview() {
  const entries = buildMoodYearMock(new Date())
  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50 px-6 py-12">
      <div className="relative z-10 mx-auto max-w-5xl">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-sky-600">
          Staff · Youth detail → Case Timeline (consensus design)
        </p>
        <div className="relative">
          <MoodHeatmap
            entriesByDate={entries}
            weeks={53}
            tooltipMode="clinical"
            title="Mood over the past year"
            subtitle="Warmer = heavier day; teal = brighter. Cooling and thinning in recent weeks signals drift."
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-card bg-gradient-to-l from-white to-transparent"
          />
        </div>
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
