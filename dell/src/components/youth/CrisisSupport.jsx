import { useEffect, useId, useRef, useState } from 'react'
import { Heart, LifeBuoy, Phone, X } from 'lucide-react'

/**
 * Low-stigma "Talk to someone now" affordance for vulnerable youth.
 * - <CrisisTrigger> renders a calm button that opens the sheet.
 * - <CrisisBanner> is a gentle inline banner shown above the composer on high risk.
 * Real Singapore helplines, warm non-alarming copy.
 */

const HELPLINES = [
  {
    id: 'sos',
    name: 'Samaritans of Singapore (SOS)',
    detail: 'Round-the-clock emotional support, any time of night.',
    number: '1767',
    tel: 'tel:1767',
  },
  {
    id: 'tinkle',
    name: 'Tinkle Friend',
    detail: 'A friendly listening line for younger people.',
    number: '1800-2744-788',
    tel: 'tel:18002744788',
  },
  {
    id: 'emergency',
    name: 'Emergency',
    detail: 'If you or someone near you is in immediate danger.',
    number: '999',
    tel: 'tel:999',
  },
]

export function CrisisSheet({ onClose }) {
  const titleId = useId()
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-panel bg-white p-8 shadow-float"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-teal-50 text-teal-600"
            >
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="font-display text-[22px] font-semibold leading-tight text-ink-800">
                You don&apos;t have to face this alone
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Kind people are ready to listen, any time.
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-control p-1.5 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="space-y-3">
          {HELPLINES.map((line) => (
            <li key={line.id}>
              <a
                href={line.tel}
                className="flex items-center gap-3 rounded-card border border-slate-200 bg-white p-4 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-teal-50 text-teal-600"
                >
                  <Phone className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-slate-800">{line.name}</span>
                  <span className="block text-[13px] font-medium text-slate-500">{line.detail}</span>
                </span>
                <span className="shrink-0 text-[15px] font-bold text-teal-600">{line.number}</span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[13px] font-medium leading-[1.55] text-slate-500">
          Reaching out is a brave, caring thing to do. Your youth worker will gently follow up with you too.
        </p>
      </div>
    </div>
  )
}

export function CrisisTrigger({ variant = 'header', className = '' }) {
  const [open, setOpen] = useState(false)

  const base =
    'inline-flex items-center gap-2 rounded-control text-[13px] font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2'

  const skins = {
    header:
      'bg-teal-50 px-3 py-2 text-teal-600 ring-1 ring-teal-100 hover:bg-teal-100',
    sidebar:
      'w-full justify-start px-4 py-3 text-teal-600 ring-1 ring-teal-100 bg-teal-50 hover:bg-teal-100 font-semibold',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${base} ${skins[variant] || skins.header} ${className}`}
      >
        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
        Talk to someone now
      </button>
      {open && <CrisisSheet onClose={() => setOpen(false)} />}
    </>
  )
}

export function CrisisBanner({ className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      role="status"
      className={`flex flex-col gap-3 rounded-card border border-teal-100 bg-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-white text-teal-600 ring-1 ring-teal-100"
        >
          <Heart className="h-4 w-4" />
        </span>
        <p className="text-[15px] leading-[1.55] text-slate-800">
          It sounds like things feel really heavy right now. You deserve support — talking to someone can help.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 self-start rounded-control bg-teal-500 px-4 py-2 text-[13px] font-bold text-white shadow-card transition-colors hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:self-auto"
      >
        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
        Talk to someone now
      </button>
      {open && <CrisisSheet onClose={() => setOpen(false)} />}
    </div>
  )
}
