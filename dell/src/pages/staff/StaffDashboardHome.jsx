import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AssignedYouthCard from '../../components/staff/AssignedYouthCard'
import PendingYouthCard from '../../components/staff/PendingYouthCard'
import UrgentAlertsPanel from '../../components/staff/UrgentAlertsPanel'
import { useStaffSession } from '../../context/StaffSessionContext'
import {
  acknowledgeRiskAlert,
  getOpenRiskAlerts,
  resolveRiskAlert,
} from '../../services/riskAlertsService'
import { assignYouthToMe, getStaffDashboard } from '../../services/staffService'

export default function StaffDashboardHome() {
  const { context } = useStaffSession()
  const [dashboard, setDashboard] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState('')
  const [alertBusyId, setAlertBusyId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setErrorMessage('')
    console.log('StaffDashboard: loading dashboard...')
    try {
      const [data, openAlerts] = await Promise.all([getStaffDashboard(), getOpenRiskAlerts()])
      console.log('StaffDashboard: dashboard loaded', {
        pendingCount: data.pending?.length ?? 0,
        pendingDebug: data.pendingDebug,
        pending: data.pending,
        alertCount: openAlerts.length,
      })
      setDashboard(data)
      setAlerts(openAlerts)
    } catch (error) {
      console.log('StaffDashboard: dashboard error:', error)
      setErrorMessage(error.message || 'Unable to load dashboard.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
    const intervalId = window.setInterval(() => {
      loadDashboard({ silent: true })
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [loadDashboard])

  async function handleAssign(youthId) {
    setAssigningId(youthId)
    setNotice('')
    try {
      await assignYouthToMe(youthId)
      setNotice('Youth assigned successfully. Dashboard refreshed.')
      await loadDashboard({ silent: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to assign youth.')
    } finally {
      setAssigningId('')
    }
  }

  async function handleAcknowledge(alertId) {
    setAlertBusyId(alertId)
    setNotice('')
    try {
      await acknowledgeRiskAlert(alertId)
      setNotice('Alert acknowledged. Follow up when you are ready.')
      await loadDashboard({ silent: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to acknowledge alert.')
    } finally {
      setAlertBusyId('')
    }
  }

  async function handleResolve(alertId) {
    setAlertBusyId(alertId)
    setNotice('')
    try {
      await resolveRiskAlert(alertId)
      setNotice('Alert marked resolved.')
      await loadDashboard({ silent: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to resolve alert.')
    } finally {
      setAlertBusyId('')
    }
  }

  const staffName = dashboard?.staff?.display_name || context?.staffProfile?.display_name || 'Staff'

  return (
    <div className="relative min-h-dvh overflow-hidden bg-white">
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
          <Link to="/" className="text-sm font-medium text-sky-600 hover:text-sky-700">
            Portal selection
          </Link>
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
            <UrgentAlertsPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              busyId={alertBusyId}
              onAssign={handleAssign}
              assigningId={assigningId}
            />

            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold text-slate-800">Assigned Youth</h2>
              {dashboard?.assigned?.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboard.assigned.map((youth) => (
                    <AssignedYouthCard key={youth.id} youth={youth} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                  <p className="text-slate-600">No assigned youth yet.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose a youth from Pending Assignment below and click Assign to Me.
                  </p>
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Pending Assignment</h2>

              {dashboard?.pendingDebug?.error && (
                <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  Pending youth query error: {dashboard.pendingDebug.error}
                </p>
              )}

              {dashboard?.pendingDebug?.isEmpty && !dashboard?.pendingDebug?.error && (
                <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No pending youth returned from backend
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
          </>
        )}
      </div>
    </div>
  )
}
