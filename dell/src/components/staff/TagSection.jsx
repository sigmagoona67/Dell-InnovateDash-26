export function TagSection({ title, items, footer, hint }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {(items || []).length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-2xl bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-100"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">Not enough information yet</span>
        )}
      </div>
      {footer && <p className="mt-3 text-xs text-slate-400">{footer}</p>}
    </section>
  )
}

export function InfoCard({ title, items, footer, accent = 'sky' }) {
  const chipClass =
    accent === 'teal'
      ? 'bg-teal-50 text-teal-800 ring-teal-100'
      : 'bg-slate-50 text-slate-700 ring-slate-100'

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {(items || []).length > 0 ? (
          items.map((item) => (
            <span key={item} className={`rounded-2xl px-3 py-1.5 text-sm font-medium ring-1 ${chipClass}`}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">Not available yet</span>
        )}
      </div>
      {footer && <p className="mt-4 text-xs text-slate-400">{footer}</p>}
    </section>
  )
}
