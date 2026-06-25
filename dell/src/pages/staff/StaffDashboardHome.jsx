import { useCallback, useEffect, useState } from 'react'
import AssignedYouthCard from '../../components/staff/AssignedYouthCard'
import CaseloadSummary from '../../components/staff/CaseloadSummary'
import PendingYouthCard from '../../components/staff/PendingYouthCard'
import StaffNav from '../../components/staff/StaffNav'
import UrgentAlertsPanel from '../../components/staff/UrgentAlertsPanel'
import { Card, Skeleton } from '../../components/ui'
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
    try {
      const [data, openAlerts] = await Promise.all([getStaffDashboard(), getOpenRiskAlerts()])
      setDashboard(data)
      setAlerts(openAlerts)
    } catch (error) {
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
  const openAlertsCount = alerts.filter((alert) => alert.status === 'open').length
  const awaitingFollowUp = alerts.filter((alert) => alert.status === 'acknowledged').length

  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <StaffNav />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-10">
        <header className="mb-6">
          <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">Staff Portal</p>
          <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">
            Staff Dashboard
          </h1>
          <p className="mt-2 text-[15px] text-slate-600">
            Welcome back, {staffName}. Your caseload at a glance.
          </p>
        </header>

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-card border border-danger-100 bg-danger-100/50 px-4 py-3 text-[13px] text-danger-700"
          >
            {errorMessage}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mb-4 rounded-card border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] text-sky-600"
          >
            {notice}
          </p>
        )}

        {loading ? (
          <div aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading dashboard…</span>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="block" className="h-20" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="block" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <CaseloadSummary
              caseloadCount={dashboard?.summary?.caseloadCount ?? 0}
              highRiskCount={dashboard?.summary?.highRiskCount ?? 0}
              openAlerts={openAlertsCount}
              awaitingFollowUp={awaitingFollowUp}
            />

            <UrgentAlertsPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              busyId={alertBusyId}
              onAssign={handleAssign}
              assigningId={assigningId}
            />

            <section className="mb-10">
              <h2 className="mb-4 font-display text-[22px] font-semibold text-ink-800">Assigned youth</h2>
              {dashboard?.assigned?.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboard.assigned.map((youth) => (
                    <AssignedYouthCard key={youth.id} youth={youth} />
                  ))}
                </div>
              ) : (
                <Card padding="lg" className="text-center">
                  <p className="text-[15px] text-slate-600">No youth assigned to you yet.</p>
                  <p className="mt-2 text-[13px] text-slate-500">
                    Choose a youth from Awaiting assignment below and assign them to your caseload.
                  </p>
                </Card>
              )}
            </section>

            <section>
              <h2 className="mb-4 font-display text-[22px] font-semibold text-ink-800">
                Awaiting assignment
              </h2>

              {dashboard?.pending?.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {dashboard.pending.map((youth) => (
                    <PendingYouthCard
                      key={youth.id}
                      youth={youth}
                      onAssign={handleAssign}
                      assigning={assigningId === youth.id}
                      staffQuizCompleted={dashboard.staffQuizCompleted}
                    />
                  ))}
                </div>
              ) : (
                <Card padding="lg" className="text-center">
                  <p className="text-[15px] text-slate-600">No youth awaiting assignment right now.</p>
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
