import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-sm lg:hidden">
          <p className="font-semibold text-slate-800">CareBridge AI</p>
          <Link to="/" className="text-sm text-sky-600">
            Home
          </Link>
        </header>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 lg:hidden">
          {[
            { id: 'companion', label: '🏠 Companion' },
            { id: 'history', label: '📅 History' },
            { id: 'worker', label: '👩 Worker' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${activeSection === item.id ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeSection === 'companion' && (
            <AICompanion
              youthId={context.youth.id}
              youthName={context.displayName}
              staffName={workerView.hasAssignedWorker ? workerView.name : ''}
            />
          )}
          {activeSection === 'history' && <ChatHistoryPanel youthId={context.youth.id} />}
          {activeSection === 'worker' && <AssignedWorkerPanel workerView={workerView} />}
        </main>
      </div>
    </div>
  )
}
