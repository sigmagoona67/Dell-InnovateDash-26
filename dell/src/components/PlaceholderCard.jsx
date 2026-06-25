import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function PlaceholderCard({ badge, title, description, actionLabel, actionTo }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-50 px-6 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-16 bottom-1/3 h-64 w-64 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-2xl rounded-panel border border-slate-200 bg-white p-8 text-center shadow-float sm:p-10">
        <p className="mb-5 inline-flex items-center gap-2 rounded-pill border border-sky-100 bg-sky-50/80 px-4 py-1.5 text-[13px] font-medium text-sky-600">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          {badge}
        </p>
        <h1 className="mb-4 font-display text-[30px] font-bold leading-[1.1] tracking-tight text-ink-800 sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-[15px] leading-[1.55] text-slate-600">{description}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && actionTo && (
            <Link
              to={actionTo}
              className="rounded-control bg-sky-500 px-6 py-3 text-[15px] font-bold text-white shadow-card transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              {actionLabel}
            </Link>
          )}
          <Link
            to="/"
            className="rounded-control px-6 py-3 text-[15px] font-bold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            Home
          </Link>
        </div>
      </section>
    </div>
  )
}
