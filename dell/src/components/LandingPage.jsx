import { useNavigate } from 'react-router-dom'
import { UserCog, MessageCircleHeart } from 'lucide-react'
import PortalCard from './PortalCard'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-50">
      {/* Soft ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-full max-w-3xl -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-100 to-transparent" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-8">
        <div className="mx-auto w-full max-w-6xl text-center">
          {/* Organisation badge */}
          <p className="mb-8 inline-flex items-center gap-2 rounded-pill border border-sky-100 bg-sky-50/80 px-4 py-1.5 text-[13px] font-medium text-sky-600">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Singapore Children&apos;s Society
          </p>

          {/* Hero */}
          <header className="mb-14 sm:mb-16">
            <h1 className="mb-5 font-display text-[40px] font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent">
                CareBridge AI
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-[1.55] text-slate-600 sm:text-xl">
              Connecting After-hours AI Support with Trusted Human Care
            </p>
          </header>

          {/* Portal cards */}
          <div
            className="grid gap-6 text-left sm:gap-8 md:grid-cols-2 md:gap-10"
            role="group"
            aria-label="Choose your portal"
          >
            <PortalCard
              icon={UserCog}
              title="Staff Portal"
              accent="sky"
              description="Manage assigned youth cases, review AI summaries, monitor risk levels, and continue personalised follow-up support."
              buttonLabel="Enter Staff Portal"
              onEnter={() => navigate('/staff-auth')}
            />
            <PortalCard
              icon={MessageCircleHeart}
              title="Youth Portal"
              accent="teal"
              description="Chat with an AI companion in a safe space after working hours while waiting for your trusted youth worker to follow up."
              buttonLabel="Enter Youth Portal"
              onEnter={() => navigate('/youth-auth')}
            />
          </div>

          {/* Footer reassurance */}
          <p className="mt-14 text-[13px] leading-[1.55] text-slate-500 sm:mt-16">
            A warm, safe space designed with care — AI supports, humans lead.
          </p>
        </div>
      </main>
    </div>
  )
}
