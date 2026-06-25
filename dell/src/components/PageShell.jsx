import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Canonical centered page shell — ambient blur blobs, tokenized colors,
 * shared max-width content column. Pages stop copy-pasting this markup.
 *
 * Props (all optional, backward compatible):
 *   badge, title, subtitle  — header block (rendered only if provided)
 *   accent ('sky'|'teal')   — badge dot + back-link accent
 *   maxWidth                — content column class (default max-w-3xl for auth shells)
 *   backTo, backLabel       — bottom back link (default Landing Page)
 *   children
 */
const ACCENT = {
  sky: { dot: 'bg-sky-500', badge: 'border-sky-100 bg-sky-50/80 text-sky-600', link: 'text-sky-600 hover:bg-sky-50 focus-visible:ring-sky-500' },
  teal: { dot: 'bg-teal-500', badge: 'border-teal-100 bg-teal-50/80 text-teal-600', link: 'text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500' },
}

export default function PageShell({
  badge,
  title,
  subtitle,
  accent = 'sky',
  maxWidth = 'max-w-3xl',
  backTo = '/',
  backLabel = 'Back to Landing Page',
  children,
}) {
  const a = ACCENT[accent] || ACCENT.sky

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-16 sm:px-8">
        <section className={`mx-auto w-full ${maxWidth}`}>
          {(badge || title || subtitle) && (
            <div className="mb-8 text-center">
              {badge && (
                <p className={`mb-4 inline-flex items-center gap-2 rounded-pill border px-4 py-1.5 text-[13px] font-medium ${a.badge}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
                  {badge}
                </p>
              )}
              {title && (
                <h1 className="mb-3 font-display text-[30px] font-bold leading-[1.1] tracking-tight text-ink-800">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mx-auto max-w-xl text-[15px] leading-[1.55] text-slate-600">{subtitle}</p>
              )}
            </div>
          )}

          {children}

          {backTo && (
            <div className="mt-6 text-center">
              <Link
                to={backTo}
                className={`inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${a.link}`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {backLabel}
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
