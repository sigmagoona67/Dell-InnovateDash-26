import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, MessageCircleHeart, UserRound } from 'lucide-react'
import AICompanion from '../../components/youth/AICompanion'
import AssignedWorkerPanel from '../../components/youth/AssignedWorkerPanel'
import ChatHistoryPanel from '../../components/youth/ChatHistoryPanel'
import YouthSidebar from '../../components/youth/YouthSidebar'
import { useYouthSession } from '../../context/YouthSessionContext'
import { getAssignedWorkerView } from '../../services/youthService'

export default function YouthPortal() {
  const { context } = useYouthSession()
  const [activeSection, setActiveSection] = useState('companion')

  const workerView = useMemo(
    () => getAssignedWorkerView(context.youth, context.assignedStaff),
    [context],
  )

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white lg:flex-row">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-teal-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-50 blur-3xl" />
      </div>

      <YouthSidebar
        active={activeSection}
        onNavigate={setActiveSection}
        youthName={context.displayName}
      />

      <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-sm lg:hidden">
          <p className="font-display text-[15px] font-semibold text-ink-800">CareBridge AI</p>
          <Link
            to="/"
            className="rounded-control px-2 py-1 text-[13px] font-medium text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            Home
          </Link>
        </header>

        <nav
          aria-label="Youth portal navigation"
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden"
        >
          {[
            { id: 'companion', icon: MessageCircleHeart, label: 'Companion' },
            { id: 'history', icon: CalendarDays, label: 'History' },
            { id: 'worker', icon: UserRound, label: 'Worker' },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-control px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${isActive ? 'bg-teal-50 text-teal-600' : 'text-slate-500'}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeSection === 'companion' && (
            <AICompanion youthId={context.youth.id} youthName={context.displayName} />
          )}
          {activeSection === 'history' && <ChatHistoryPanel youthId={context.youth.id} />}
          {activeSection === 'worker' && <AssignedWorkerPanel workerView={workerView} />}
        </main>
      </div>
    </div>
  )
}
