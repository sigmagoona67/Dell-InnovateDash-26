import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Check, Info, Waves } from 'lucide-react'
import { Button, Skeleton } from '../ui'
import { getCaseloadDrift } from '../../services/quietSignalService'

const TIER_LABEL = { amber: 'Early signal', watch: 'Worth a look' }

function Sparkline({ values }) {
  if (!values?.length) return null
  const w = 132
  const h = 36
  const pad = 3
  const max = 100
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const pts = values.map((v, i) => {
    const x = pad + i * step
    const y = h - pad - (Math.max(0, Math.min(max, v)) / max) * (h - pad * 2)
    return [x, y]
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`14-day trend, now ${values[values.length - 1]} of 100`}
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke="var(--color-warning-500)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--color-warning-500)" />
    </svg>
  )
}

function DriftMeter({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-pill bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-pill bg-warning-500" style={{ width: `${score}%` }} />
      </div>
      <span className="text-[13px] font-bold text-ink-800">{score}</span>
    </div>
  )
}

function QuietSignalCard({ item }) {
  const [planned, setPlanned] = useState(false)
  return (
    <article className="rounded-card border border-warning-100 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[18px] font-semibold text-ink-800">{item.youthName}</h3>
            <span className="inline-flex items-center gap-1 rounded-pill bg-warning-100 px-2.5 py-0.5 text-[12px] font-semibold text-warning-500">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              {TIER_LABEL[item.tier] || 'Drift'}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            Explicit per-message risk:{' '}
            <span className="font-semibold text-success-600">low</span> — this only shows in the trend
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <DriftMeter score={item.score} />
          <Sparkline values={item.series} />
        </div>
      </div>

      {item.signals?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.signals.map((s) => (
            <span
              key={s.key}
              title={s.detail}
              className="inline-flex items-center rounded-pill bg-warning-100 px-2.5 py-1 text-[12px] font-medium text-warning-500"
            >
              {s.label}
              {s.detail && <span className="ml-1 font-normal text-slate-600">· {s.detail}</span>}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {planned ? (
          <span className="inline-flex items-center gap-1.5 rounded-control bg-success-100 px-3 py-2 text-[13px] font-semibold text-success-600">
            <Check className="h-4 w-4" aria-hidden="true" />
            Check-in planned
          </span>
        ) : (
          <Button accent="sky" size="sm" onClick={() => setPlanned(true)}>
            Plan a check-in
          </Button>
        )}
        <Link
          to={`/staff-dashboard/youth/${item.youthId}`}
          className="inline-flex items-center rounded-control bg-sky-50 px-3.5 py-2 text-[13px] font-medium text-sky-600 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
        >
          View case
        </Link>
      </div>
    </article>
  )
}

export default function QuietSignalPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getCaseloadDrift()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Default to silence: nothing trending up = nothing to show.
  if (!loading && items.length === 0) return null

  return (
    <section
      aria-labelledby="quiet-signal-heading"
      className="mb-6 rounded-card border border-warning-100 bg-warning-100/30 p-4 shadow-card sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-warning-500">
            <Waves className="h-4 w-4" aria-hidden="true" />
            The Quiet Signal
          </p>
          <h2 id="quiet-signal-heading" className="mt-1 font-display text-[22px] font-semibold text-ink-800">
            Drifting quietly
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-slate-600">
            Youth whose language and engagement are trending down — before they say so outright.
            An early prompt to reach out, <span className="font-semibold">not a crisis alert</span>.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-pill bg-white px-3 py-1 text-[12px] font-medium text-slate-500 ring-1 ring-warning-100">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          Explainable · research-backed
        </span>
      </div>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-2" aria-live="polite" aria-busy="true">
          <span className="sr-only">Checking caseload trends…</span>
          <Skeleton variant="block" className="h-28" />
          <Skeleton variant="block" className="h-28" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <QuietSignalCard key={item.youthId} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
