import { Link } from 'react-router-dom'
import AmbientBackground from './AmbientBackground'

export default function PageShell({ badge, title, subtitle, children }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-white">
      <AmbientBackground variant="centered" />

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
