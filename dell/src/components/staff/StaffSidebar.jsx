const TABS = [
  { id: 'characteristics', icon: '🧩', label: 'Characteristics' },
  { id: 'timeline', icon: '📅', label: 'Case Timeline' },
  { id: 'schedule', icon: '🗓️', label: 'Schedule' },
  { id: 'offline', icon: '📝', label: 'Offline Session Update' },
]

export default function StaffSidebar({ active, onNavigate, staffName, youthName, onBack }) {
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
        {TABS.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isActive
                  ? 'bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100'
                  : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-700'
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
