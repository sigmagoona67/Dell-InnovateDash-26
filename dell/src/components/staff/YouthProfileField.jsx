const CHIP_STYLES = {
  static: 'bg-sky-50 text-sky-800 ring-sky-200',
  dynamic: 'bg-violet-50 text-violet-800 ring-violet-200',
}

function TagChip({ label, source }) {
  return (
    <span className={`rounded-2xl px-3 py-1.5 text-sm font-medium ring-1 ${CHIP_STYLES[source]}`}>
      {label}
    </span>
  )
}

export function YouthProfileLegend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
        Static · onboarding
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
        Dynamic · AI-discovered
      </span>
    </div>
  )
}

export function YouthProfileField({ title, hint, staticItems = [], dynamicItems = [], view = 'all' }) {
  const showStatic = view === 'all' || view === 'static'
  const showDynamic = view === 'all' || view === 'dynamic'

  const staticTags = (staticItems || []).filter(Boolean).map(String)
  const dynamicTags = (dynamicItems || []).filter(Boolean).map(String)
  const hasStatic = staticTags.length > 0
  const hasDynamic = dynamicTags.length > 0
  const isEmpty =
    (showStatic && !hasStatic && !showDynamic) ||
    (showDynamic && !hasDynamic && !showStatic) ||
    (!showStatic && !showDynamic) ||
    (showStatic && !hasStatic && showDynamic && !hasDynamic)

  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {showStatic && hasStatic && staticTags.map((item) => <TagChip key={`s-${item}`} label={item} source="static" />)}
        {showDynamic && hasDynamic && dynamicTags.map((item) => <TagChip key={`d-${item}`} label={item} source="dynamic" />)}
        {isEmpty && <span className="text-sm text-slate-400">Not enough information yet</span>}
        {showDynamic && !hasDynamic && view === 'dynamic' && (
          <span className="text-sm text-slate-400">No AI-discovered items yet</span>
        )}
      </div>
    </section>
  )
}
