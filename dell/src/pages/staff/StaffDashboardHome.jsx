import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AssignedYouthCard from '../../components/staff/AssignedYouthCard'
import PendingYouthCard from '../../components/staff/PendingYouthCard'
import StaffSchedulePanel from '../../components/staff/StaffSchedulePanel'
import { useStaffSession } from '../../context/StaffSessionContext'
import { assignYouthToMe, getStaffDashboard } from '../../services/staffService'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned Youth' },
  { id: 'pending', label: 'Pending Assignment' },
]

function DashboardFilterBar({ activeFilter, onChange, assignedCount, pendingCount }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-6xl gap-2 px-4 py-3 sm:px-6">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.id
          const count =
            filter.id === 'assigned'
              ? assignedCount
              : filter.id === 'pending'
                ? pendingCount
                : assignedCount + pendingCount

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onChange(filter.id)}
              className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                active
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50'
              }`}
              aria-pressed={active}
            >
              <span className="block truncate">{filter.label}</span>
              <span className={`mt-0.5 block text-xs font-medium ${active ? 'text-sky-100' : 'text-slate-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function StaffDashboardHome() {
  const { context } = useStaffSession()
  const location = useLocation()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const loadDashboard = useCallback(async () => {
    if (!context?.staffProfile?.id) {
      setLoading(false)
      setErrorMessage('Staff profile is not ready yet. Please refresh the page.')
      return
    }
    setLoading(true)
    setErrorMessage('')
    console.log('StaffDashboard: loading dashboard...')
    try {
      const data = await getStaffDashboard(context)
      console.log('StaffDashboard: dashboard loaded', {
        pendingCount: data.pending?.length ?? 0,
        pendingDebug: data.pendingDebug,
        pending: data.pending,
      })
      setDashboard(data)
    } catch (error) {
      console.log('StaffDashboard: dashboard error:', error)
      setErrorMessage(error.message || 'Unable to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [context])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard, location.key])

  async function handleAssign(youthId) {
    setAssigningId(youthId)
    setNotice('')
    try {
      await assignYouthToMe(youthId)
      setNotice('Youth assigned successfully. Dashboard refreshed.')
      await loadDashboard()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to assign youth.')
    } finally {
      setAssigningId('')
    }
  }

  const staffName = dashboard?.staff?.display_name || context?.staffProfile?.display_name || 'Staff'
  const staffId = dashboard?.staff?.id || context?.staffProfile?.id
  const assignedCount = dashboard?.assigned?.length ?? 0
  const pendingCount = dashboard?.pending?.length ?? 0
  const showAssigned = activeFilter === 'all' || activeFilter === 'assigned'
  const showPending = activeFilter === 'all' || activeFilter === 'pending'

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white lg:flex-row">
      <StaffSchedulePanel staffId={staffId} />

      <div className="relative flex min-h-dvh flex-1 flex-col overflow-y-auto pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Staff Portal</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">Staff Dashboard</h1>
            <p className="mt-2 text-slate-600">Welcome back, {staffName}. Manage assigned youth and review AI insights.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/staff-dashboard/team"
              className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              Care team
            </Link>
            <Link
              to="/staff-dashboard/profile"
              className="text-sm font-medium text-sky-600 hover:text-sky-700"
            >
              My Profile
            </Link>
            <Link to="/" className="text-sm font-medium text-sky-600 hover:text-sky-700">
              Portal selection
            </Link>
          </div>
        </header>

        {errorMessage && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        {notice && (
          <p className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500">Loading dashboard…</p>
        ) : (
          <>
            {showAssigned && (
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-bold text-slate-800">Assigned Youth</h2>
                {dashboard?.assigned?.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dashboard.assigned.map((youth) => (
                      <AssignedYouthCard key={youth.id} youth={youth} onReleased={loadDashboard} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                    <p className="text-slate-600">No assigned youth yet.</p>
                    {activeFilter !== 'assigned' && (
                      <p className="mt-2 text-sm text-slate-500">
                        Choose a youth from Pending Assignment below and click Assign to Me.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {showPending && (
              <section className="pb-2">
                <h2 className="mb-4 text-xl font-bold text-slate-800">Pending Assignment</h2>

                {dashboard?.pendingDebug?.error && (
                  <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    Pending youth query error: {dashboard.pendingDebug.error}
                  </p>
                )}

                {dashboard?.pendingDebug?.buildError && (
                  <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Pending youth loaded from backend ({dashboard.pendingDebug.rawCount}) but some details could not be
                    loaded. Cards are shown in simplified form.
                  </p>
                )}

                {dashboard?.pendingDebug?.isEmpty && !dashboard?.pendingDebug?.error && (
                  <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    No unassigned youth in the pool right now. If you expected more, check InsForge RLS policies for
                    staff read access to unassigned youth.
                  </p>
                )}

                {dashboard?.pending?.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {dashboard.pending.map((youth) => (
                      <PendingYouthCard
                        key={youth.id}
                        youth={youth}
                        onAssign={handleAssign}
                        assigning={assigningId === youth.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                    <p className="text-slate-600">No youth waiting for assignment right now.</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {!loading && (
        <DashboardFilterBar
          activeFilter={activeFilter}
          onChange={setActiveFilter}
          assignedCount={assignedCount}
          pendingCount={pendingCount}
        />
      )}
      </div>
    </div>
  )
}
