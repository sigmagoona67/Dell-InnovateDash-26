import PortalCard from './PortalCard'
import { useNavigate } from 'react-router-dom'
import AmbientBackground from './AmbientBackground'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-white">
      <AmbientBackground variant="landing" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-8">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Organisation badge */}
          <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-4 py-1.5 text-sm font-medium text-sky-600">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Singapore Children&apos;s Society
          </p>

          {/* Hero */}
          <header className="mb-14 sm:mb-16">
            <h1 className="mb-5 text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent">
                CareBridge AI
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Connecting After-hours AI Support with Trusted Human Care
            </p>
          </header>

          {/* Portal cards */}
          <div
            className="grid gap-6 sm:gap-8 md:grid-cols-2 md:gap-10"
            role="group"
            aria-label="Choose your portal"
          >
            <PortalCard
              emoji="👩‍💼"
              title="Staff Portal"
              accent="sky"
              description="Manage assigned youth cases, review AI summaries, monitor risk levels, and continue personalised follow-up support."
              buttonLabel="Enter Staff Portal"
              onEnter={() => navigate('/staff-auth')}
            />
            <PortalCard
              emoji="🧑"
              title="Youth Portal"
              accent="teal"
              description="Chat with an AI companion in a safe space after working hours while waiting for your trusted youth worker to follow up."
              buttonLabel="Enter Youth Portal"
              onEnter={() => navigate('/youth-auth')}
            />
          </div>

          {/* Footer reassurance */}
          <p className="mt-14 text-sm leading-relaxed text-slate-500 sm:mt-16">
            A warm, safe space designed with care — AI supports, humans lead.
          </p>
        </div>
      </main>
    </div>
  )
}
