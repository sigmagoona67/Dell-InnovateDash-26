import { CalendarDays, MessageCircleHeart, UserRound } from 'lucide-react'
import { CrisisTrigger } from './CrisisSupport'

const NAV_ITEMS = [
  { id: 'companion', icon: MessageCircleHeart, label: 'AI Companion' },
  { id: 'history', icon: CalendarDays, label: 'Chat History' },
  { id: 'worker', icon: UserRound, label: 'Assigned Worker' },
]

export default function YouthSidebar({ active, onNavigate, youthName }) {
  return (
    <aside className="flex w-full flex-col border-r border-slate-200 bg-white p-4 lg:w-64 lg:p-6">
      <div className="mb-8">
        <p className="text-[12px] font-medium uppercase tracking-wide text-teal-600">Youth Portal</p>
        <h2 className="mt-1 font-display text-[18px] font-semibold text-ink-800">CareBridge AI</h2>
        <p className="mt-1 text-[13px] font-medium text-slate-500">Welcome, {youthName}</p>
      </div>

      <nav className="space-y-2" aria-label="Youth portal navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`
                flex w-full items-center gap-3 rounded-control px-4 py-3 text-left text-[15px] font-bold
                transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2
                ${isActive
                  ? 'bg-teal-50 text-teal-600 ring-1 ring-teal-100'
                  : 'text-slate-600 hover:bg-teal-50 hover:text-teal-600'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto pt-8">
        <CrisisTrigger variant="sidebar" />
      </div>
    </aside>
  )
}
