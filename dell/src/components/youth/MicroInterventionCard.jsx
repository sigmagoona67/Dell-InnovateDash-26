import { Moon, Wind, Phone, X } from 'lucide-react'
import { Button } from '../ui'

/**
 * The youth-side Just-In-Time Adaptive Intervention (JITAI).
 *
 * Surfaced ONLY when the Quiet Signal is amber AND it's the youth's late-night
 * window — the moment the evidence says matters most (distress peaks at night),
 * delivered instead of waiting for a next-morning flag. Calm, opt-in, never
 * alarming; the youth can always dismiss it.
 *
 * Presentational only — the parent decides when to show it and wires the
 * actions (breathe / talk / dismiss).
 */
export default function MicroInterventionCard({
  name = 'there',
  timeLabel = 'late',
  onBreathe,
  onTalk,
  onDismiss,
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jitai-title"
      className="relative w-full max-w-md rounded-panel border border-teal-100 bg-white p-6 shadow-float sm:p-8"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-pill text-slate-400 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <p className="inline-flex items-center gap-1.5 rounded-pill bg-teal-50 px-3 py-1 text-[12px] font-medium text-teal-600">
        <Moon className="h-3.5 w-3.5" aria-hidden="true" />
        A gentle moment · {timeLabel}
      </p>

      <h2 id="jitai-title" className="mt-4 font-display text-[24px] font-bold leading-tight text-ink-800">
        It’s late, {name}. The last few nights have felt heavier.
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        No pressure to talk or explain. Want to take 90 seconds to breathe — or
        reach someone who’s here right now?
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        <Button accent="teal" size="lg" onClick={onBreathe} className="w-full">
          <Wind className="h-5 w-5" aria-hidden="true" />
          Breathe with me — 90 seconds
        </Button>
        <Button variant="secondary" accent="teal" size="lg" onClick={onTalk} className="w-full">
          <Phone className="h-5 w-5" aria-hidden="true" />
          Talk to someone now
        </Button>
        <Button variant="ghost" accent="teal" onClick={onDismiss} className="w-full">
          Not tonight
        </Button>
      </div>

      <p className="mt-5 text-center text-[12px] leading-relaxed text-slate-500">
        You’re seeing this because your check-ins have felt heavier lately.
        It’s private — only you can see it.
      </p>
    </div>
  )
}
