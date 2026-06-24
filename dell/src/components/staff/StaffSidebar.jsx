const MAIN_TABS = [
  { id: 'characteristics', icon: '🧩', label: 'Characteristics' },
  { id: 'timeline', icon: '📅', label: 'Case Timeline' },
  { id: 'schedule', icon: '🗓️', label: 'Schedule' },
  { id: 'offline', icon: '📝', label: 'Offline Session Update' },
]

const RELEASE_CASE_ACTION = { id: 'release-case', icon: '📤', label: 'Release Case' }

function NavButton({ item, isActive, onNavigate, accent = 'sky' }) {
  const activeClasses =
    accent === 'sky'
      ? 'bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100'
      : 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100'
  const focusClasses =
    accent === 'sky' ? 'focus-visible:ring-sky-400' : 'focus-visible:ring-teal-400'

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${focusClasses} ${
        isActive ? activeClasses : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-700'
      }`}
    >
      <span className="text-lg" aria-hidden="true">
        {item.icon}
      </span>
      {item.label}
    </button>
  )
}

export default function StaffSidebar({
  active,
  onNavigate,
  staffName,
  youthName,
  onBack,
  onReleaseCase,
  canReleaseCase = false,
}) {
  return (
    <aside className="relative z-10 flex w-full flex-col border-r border-slate-100 bg-white p-4 lg:w-72 lg:p-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Staff Portal</p>
        <h2 className="mt-1 text-lg font-bold text-slate-800">CareBridge AI</h2>
        <p className="mt-1 text-sm text-slate-500">Worker: {staffName}</p>
        {youthName && <p className="mt-1 text-sm font-medium text-slate-700">Youth: {youthName}</p>}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 rounded-2xl border border-slate-100 px-4 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
        >
          ← Back to Dashboard
        </button>
      )}

      <nav className="space-y-2" aria-label="Youth detail navigation">
        {MAIN_TABS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={active === item.id}
            onNavigate={onNavigate}
          />
        ))}
        {canReleaseCase && onReleaseCase && (
          <button
            type="button"
            onClick={onReleaseCase}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-rose-50/80 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <span className="text-lg" aria-hidden="true">
              {RELEASE_CASE_ACTION.icon}
            </span>
            {RELEASE_CASE_ACTION.label}
          </button>
        )}
      </nav>
    </aside>
  )
}
