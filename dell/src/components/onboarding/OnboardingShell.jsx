export function ChipButton({ label, selected, disabled, onToggle, className = '' }) {
  const dimmed = disabled && !selected

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={dimmed}
      aria-pressed={selected}
      className={`
        rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2
        ${selected
          ? 'border-teal-400 bg-teal-50 text-teal-700 shadow-sm'
          : dimmed
            ? 'cursor-not-allowed border-slate-200 bg-white text-slate-400 opacity-40'
            : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50'}
        ${className}
      `}
    >
      {label}
    </button>
  )
}

export function ProfileChip({ label }) {
  return (
    <span className="rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-sm text-blue-700">
      {label}
    </span>
  )
}

export function SelectionLimitHint({ selected, max, limitMessage }) {
  if (selected >= max) {
    return (
      <p className="text-sm text-gray-500">
        {max} / {max} selected — deselect one to change your choice
      </p>
    )
  }

  if (limitMessage) {
    return <p className="text-sm text-rose-600">{limitMessage}</p>
  }

  return (
    <p className="text-sm text-gray-500">
      {selected} / {max} selected
    </p>
  )
}

export function OnboardingShell({
  badge,
  step,
  totalSteps,
  heading,
  subtitle,
  instruction,
  note,
  children,
  onPrevious,
  onNext,
  nextLabel = 'Next >',
  nextDisabled = false,
  loading = false,
  headerExtra = null,
  embedded = false,
}) {
  const progress = Math.round(((step + 1) / totalSteps) * 100)

  const headerBlock = (
    <header className={embedded ? 'mb-6' : 'mb-8'}>
      <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50/80 px-4 py-1.5 text-sm font-medium text-teal-600">
        {badge}
      </p>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-sky-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-slate-500">
        Step {step + 1} of {totalSteps}
      </p>
    </header>
  )

  const sectionBlock = (
    <section
      className={`flex flex-col rounded-3xl border border-slate-100 bg-white shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)] ${
        embedded ? 'p-5' : 'flex-1 p-6 sm:p-8'
      }`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`mb-2 font-bold tracking-tight text-slate-800 ${embedded ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
            {heading}
          </h1>
          <p className="text-slate-600">{subtitle}</p>
          {note && <p className="mt-2 text-sm text-slate-500">{note}</p>}
          {instruction && <p className="mt-4 text-sm font-medium text-slate-700">{instruction}</p>}
        </div>
        {headerExtra}
      </div>

      <div className={embedded ? '' : 'flex-1'}>{children}</div>

      <div className={`flex items-center justify-end gap-3 ${embedded ? 'mt-8' : 'mt-10'}`}>
        {step > 0 && (
          <button
            type="button"
            onClick={onPrevious}
            disabled={loading}
            className="rounded-2xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            &lt; Previous
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={loading || nextDisabled}
          className="rounded-2xl bg-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Saving...' : nextLabel}
        </button>
      </div>
    </section>
  )

  if (embedded) {
    return (
      <div className="flex flex-col">
        {headerBlock}
        {sectionBlock}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-sky-50 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:px-8">
        {headerBlock}
        {sectionBlock}
      </main>
    </div>
  )
}
