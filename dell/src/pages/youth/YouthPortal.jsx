import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AICompanion from '../../components/youth/AICompanion'
import AssignedWorkerPanel from '../../components/youth/AssignedWorkerPanel'
import ChatHistoryPanel from '../../components/youth/ChatHistoryPanel'
import YouthProfilePanel from '../../components/youth/YouthProfilePanel'
import YouthSidebar from '../../components/youth/YouthSidebar'
import { useYouthSession } from '../../context/YouthSessionContext'
import { getAssignedWorkerView } from '../../services/youthService'

export default function YouthPortal() {
  const { context, refresh } = useYouthSession()
  const [activeSection, setActiveSection] = useState('companion')
  const workerRefreshDone = useRef(false)

  useEffect(() => {
    if (activeSection !== 'worker') {
      workerRefreshDone.current = false
      return
    }
    if (workerRefreshDone.current) return
    workerRefreshDone.current = true
    refresh({ silent: true })
  }, [activeSection, refresh])

  const workerView = useMemo(
    () => getAssignedWorkerView(context.youth, context.assignedStaff),
    [context],
  )

  return (
    <div className="relative flex min-h-dvh flex-col bg-slate-50 lg:flex-row">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-teal-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-50 blur-3xl" />
      </div>

      <YouthSidebar
        active={activeSection}
        onNavigate={setActiveSection}
        youthName={context.displayName}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <p className="font-semibold text-slate-900">CareBridge AI</p>
          <Link to="/" className="text-sm font-medium text-teal-600">
            Home
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeSection === 'companion' && (
            <AICompanion
              youthId={context.youth.id}
              youthName={context.displayName}
              staffName={workerView.hasAssignedWorker ? workerView.name : ''}
            />
          )}
          {activeSection === 'history' && <ChatHistoryPanel youthId={context.youth.id} />}
          {activeSection === 'worker' && (
            <AssignedWorkerPanel
              workerView={workerView}
              assignedStaff={context.assignedStaff}
            />
          )}
          {activeSection === 'profile' && <YouthProfilePanel youthId={context.youth.id} />}
        </main>
      </div>
    </div>
  )
}
