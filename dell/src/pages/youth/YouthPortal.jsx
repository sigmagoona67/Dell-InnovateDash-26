import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AICompanion from '../../components/youth/AICompanion'
import AssignedWorkerPanel from '../../components/youth/AssignedWorkerPanel'
import ChatHistoryPanel from '../../components/youth/ChatHistoryPanel'
import YouthSchedulePanel from '../../components/youth/YouthSchedulePanel'
import YouthProfilePanel from '../../components/youth/YouthProfilePanel'
import NewAssignmentDialog from '../../components/youth/NewAssignmentDialog'
import ReassignmentPanel from '../../components/shared/ReassignmentPanel'
import YouthSidebar from '../../components/youth/YouthSidebar'
import { useYouthSession } from '../../context/YouthSessionContext'
import { detectNewYouthAssignment } from '../../lib/youthAssignmentStorage'
import { getAssignedWorkerView } from '../../services/youthService'

const ASSIGNMENT_POLL_MS = 20000
const PORTAL_SECTIONS = new Set([
  'companion',
  'history',
  'schedule',
  'worker',
  'profile',
  'reassignment',
])

export default function YouthPortal() {
  const { context, refresh } = useYouthSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeSection = PORTAL_SECTIONS.has(tabParam) ? tabParam : 'companion'
  const [newAssignmentOpen, setNewAssignmentOpen] = useState(false)
  const [assignmentEpoch, setAssignmentEpoch] = useState(0)
  const workerRefreshDone = useRef(false)

  function setActiveSection(section) {
    if (section === 'companion') {
      setSearchParams({}, { replace: true })
      return
    }
    setSearchParams({ tab: section }, { replace: true })
  }

  useEffect(() => {
    if (activeSection !== 'worker') {
      workerRefreshDone.current = false
      return
    }
    if (workerRefreshDone.current) return
    workerRefreshDone.current = true
    refresh({ silent: true })
  }, [activeSection, refresh])

  useEffect(() => {
    if (!context?.youth?.id) return

    if (detectNewYouthAssignment(context.youth.id, context.youth.assigned_staff_id)) {
      setNewAssignmentOpen(true)
      setAssignmentEpoch((value) => value + 1)
    }
  }, [context?.youth?.id, context?.youth?.assigned_staff_id])

  useEffect(() => {
    if (!context?.youth?.id) return undefined

    const intervalId = window.setInterval(() => {
      refresh({ silent: true })
    }, ASSIGNMENT_POLL_MS)

    return () => window.clearInterval(intervalId)
  }, [context?.youth?.id, refresh])

  const workerView = useMemo(
    () => getAssignedWorkerView(context.youth, context.assignedStaff),
    [context],
  )

  function handleViewWorker() {
    setNewAssignmentOpen(false)
    setActiveSection('worker')
  }

  function handleRequestReassignment() {
    setNewAssignmentOpen(false)
    setActiveSection('reassignment')
  }

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

        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 lg:hidden">
          {[
            { id: 'companion', label: '🏠 Companion' },
            { id: 'history', label: '📅 History' },
            { id: 'schedule', label: '🗓️ Schedule' },
            { id: 'worker', label: '👩 Worker' },
            { id: 'profile', label: '👤 Profile' },
            { id: 'reassignment', label: '🔄 Reassign' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${
                activeSection === item.id ? 'bg-teal-50 text-teal-700' : 'text-slate-500'
              }`}
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
          {activeSection === 'schedule' && (
            <YouthSchedulePanel
              youthId={context.youth.id}
              staffId={context.youth.assigned_staff_id}
              workerName={workerView.hasAssignedWorker ? workerView.name : 'Youth Worker'}
            />
          )}
          {activeSection === 'worker' && (
            <AssignedWorkerPanel
              workerView={workerView}
              assignedStaff={context.assignedStaff}
            />
          )}
          {activeSection === 'profile' && <YouthProfilePanel youthId={context.youth.id} />}
          {activeSection === 'reassignment' && (
            <ReassignmentPanel
              role="youth"
              youthId={context.youth.id}
              youthRow={context.youth}
              youthName={context.displayName}
              requesterProfileId={context.profile.id}
              assignedStaffId={context.youth.assigned_staff_id}
              canSubmit={workerView.hasAssignedWorker}
              assignmentEpoch={assignmentEpoch}
            />
          )}
        </main>
      </div>

      <NewAssignmentDialog
        open={newAssignmentOpen}
        workerName={workerView.hasAssignedWorker ? workerView.name : 'Your youth worker'}
        onViewWorker={handleViewWorker}
        onRequestReassignment={handleRequestReassignment}
        onContinue={() => setNewAssignmentOpen(false)}
      />
    </div>
  )
}
