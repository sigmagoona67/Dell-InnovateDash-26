const NAV_ITEMS = [
  { id: 'companion', icon: '🏠', label: 'AI Companion' },
  { id: 'history', icon: '📅', label: 'Chat History' },
  { id: 'worker', icon: '👩', label: 'Assigned Worker' },
  { id: 'profile', icon: '👤', label: 'My Profile' },
]

export default function YouthSidebar({ active, onNavigate, youthName }) {
  return (
    <aside className="relative z-20 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:h-dvh lg:w-72 lg:border-b-0 lg:border-r lg:overflow-y-auto">
      <div className="border-b border-slate-100 px-5 py-5 lg:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Youth Portal</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">CareBridge AI</h2>
        <p className="mt-1 truncate text-sm text-slate-600">Welcome, {youthName}</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-4 lg:py-4" aria-label="Youth portal navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`
                flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-semibold
                transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400
                lg:w-full lg:gap-3 lg:rounded-2xl lg:py-3.5
                ${isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-800 lg:bg-transparent lg:text-slate-700'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-base lg:text-lg" aria-hidden="true">
                {item.icon}
              </span>
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
