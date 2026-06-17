import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AmbientBackground from '../../components/AmbientBackground'
import AICompanion from '../../components/youth/AICompanion'
import AssignedWorkerPanel from '../../components/youth/AssignedWorkerPanel'
import ChatHistoryPanel from '../../components/youth/ChatHistoryPanel'
import YouthSchedulePanel from '../../components/youth/YouthSchedulePanel'
import YouthSidebar from '../../components/youth/YouthSidebar'
import { useYouthSession } from '../../context/YouthSessionContext'
import { getAssignedWorkerView } from '../../services/youthService'

export default function YouthPortal() {
  const { context } = useYouthSession()
  const [activeSection, setActiveSection] = useState('companion')
  const [workerView, setWorkerView] = useState({ hasAssignedWorker: false })

  useEffect(() => {
    let cancelled = false

    async function loadWorkerView() {
      const view = await getAssignedWorkerView(context.youth, context.assignedStaff)
      if (!cancelled) setWorkerView(view)
    }

    loadWorkerView()
    return () => {
      cancelled = true
    }
  }, [context])

  const workerName = workerView.hasAssignedWorker
    ? workerView.name
    : context.assignedStaff?.display_name || 'Youth Worker'

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-white lg:flex-row">
      <AmbientBackground variant="teal" />

      <YouthSidebar
        active={activeSection}
        onNavigate={setActiveSection}
        youthName={context.displayName}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="relative z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-sm lg:hidden">
          <p className="font-semibold text-slate-800">CareBridge AI</p>
          <Link to="/" className="text-sm text-sky-600">
            Home
          </Link>
        </header>

        <div className="relative z-10 flex gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 lg:hidden">
          {[
            { id: 'companion', label: '🏠 Companion' },
            { id: 'history', label: '📅 History' },
            { id: 'schedule', label: '🗓️ Schedule' },
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

        <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeSection === 'companion' && (
            <AICompanion youthId={context.youth.id} youthName={context.displayName} />
          )}
          {activeSection === 'history' && <ChatHistoryPanel youthId={context.youth.id} />}
          {activeSection === 'schedule' && (
            <YouthSchedulePanel
              youthId={context.youth.id}
              staffId={context.youth.assigned_staff_id}
              workerName={workerName}
            />
          )}
          {activeSection === 'worker' && <AssignedWorkerPanel workerView={workerView} />}
        </main>
      </div>
    </div>
  )
}
