const MAIN_NAV_ITEMS = [
  { id: 'companion', icon: '🏠', label: 'AI Companion' },
  { id: 'history', icon: '📅', label: 'Chat History' },
  { id: 'schedule', icon: '🗓️', label: 'Schedule' },
  { id: 'worker', icon: '👩', label: 'Assigned Worker' },
  { id: 'profile', icon: '👤', label: 'My Profile' },
]

const REASSIGNMENT_ITEM = { id: 'reassignment', icon: '🔄', label: 'Request Reassignment' }

function NavButton({ item, isActive, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      className={`
        flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold
        transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400
        ${isActive
          ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100'
          : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-700'}
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="text-lg" aria-hidden="true">
        {item.icon}
      </span>
      {item.label}
    </button>
  )
}

export default function YouthSidebar({ active, onNavigate, youthName }) {
  return (
    <aside className="relative z-10 flex w-full flex-col border-r border-slate-100 bg-white p-4 lg:w-64 lg:p-6">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Youth Portal</p>
        <h2 className="mt-1 text-lg font-bold text-slate-800">CareBridge AI</h2>
        <p className="mt-1 text-sm text-slate-500">Welcome, {youthName}</p>
      </div>

      <nav className="space-y-2" aria-label="Youth portal navigation">
        {MAIN_NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={active === item.id}
            onNavigate={onNavigate}
          />
        ))}
        <NavButton
          item={REASSIGNMENT_ITEM}
          isActive={active === REASSIGNMENT_ITEM.id}
          onNavigate={onNavigate}
        />
      </nav>
    </aside>
  )
}
