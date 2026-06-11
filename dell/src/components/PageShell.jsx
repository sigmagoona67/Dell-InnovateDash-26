import { Link } from 'react-router-dom'

export default function PageShell({ badge, title, subtitle, children }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-16 sm:px-8">
        <section className="mx-auto w-full max-w-3xl">
          <div className="mb-8 text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-4 py-1.5 text-sm font-medium text-sky-600">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              {badge}
            </p>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto max-w-xl text-base text-slate-600 sm:text-lg">{subtitle}</p>
          </div>

          {children}

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex rounded-xl px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
            >
              Back to Landing Page
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
