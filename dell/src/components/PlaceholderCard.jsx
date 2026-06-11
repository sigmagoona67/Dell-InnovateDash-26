import { Link } from 'react-router-dom'

export default function PlaceholderCard({ badge, title, description, actionLabel, actionTo }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-white px-6 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-16 bottom-1/3 h-64 w-64 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-[0_8px_36px_-14px_rgba(45,90,110,0.2)] sm:p-10">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-4 py-1.5 text-sm font-medium text-sky-600">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          {badge}
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">{title}</h1>
        <p className="mx-auto mb-8 max-w-xl text-slate-600">{description}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={actionTo}
            className="rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          >
            {actionLabel}
          </Link>
          <Link
            to="/"
            className="rounded-2xl px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
          >
            Home
          </Link>
        </div>
      </section>
    </div>
  )
}
