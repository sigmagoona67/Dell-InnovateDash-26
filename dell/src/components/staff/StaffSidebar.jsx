import { Puzzle, CalendarDays, NotebookPen, ArrowLeft } from 'lucide-react'

const TABS = [
  { id: 'characteristics', Icon: Puzzle, label: 'Characteristics' },
  { id: 'timeline', Icon: CalendarDays, label: 'Case Timeline' },
  { id: 'offline', Icon: NotebookPen, label: 'Offline Session Update' },
]

export default function StaffSidebar({ active, onNavigate, staffName, youthName, onBack }) {
  return (
    <aside className="flex w-full flex-col border-r border-slate-200 bg-white p-4 lg:w-72 lg:p-6">
      <div className="mb-6">
        <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">Staff Portal</p>
        <h2 className="mt-1 font-display text-[18px] font-semibold text-ink-800">CareBridge AI</h2>
        <p className="mt-1 text-[13px] text-slate-500">Worker: {staffName}</p>
        {youthName && <p className="mt-1 text-[13px] font-medium text-slate-600">Youth: {youthName}</p>}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-control border border-slate-200 px-4 py-2 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </button>
      )}

      <nav className="space-y-2" aria-label="Youth detail navigation">
        {TABS.map(({ id, Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex w-full items-center gap-3 rounded-control px-4 py-3 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${
                isActive ? 'bg-sky-50 text-sky-600' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-600'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
