import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CaseTimelineTab from '../../components/staff/CaseTimelineTab'
import CharacteristicsTab from '../../components/staff/CharacteristicsTab'
import OfflineSessionTab from '../../components/staff/OfflineSessionTab'
import YouthScheduleTab from '../../components/staff/YouthScheduleTab'
import StaffSidebar from '../../components/staff/StaffSidebar'
import PendingYouthCard from '../../components/staff/PendingYouthCard'
import { useStaffSession } from '../../context/StaffSessionContext'
import { resolveCurrentConcern, resolveCasePreview } from '../../lib/dashboardCard'
import { resolveYouthRiskLevel } from '../../lib/riskResolver'
import { assignYouthToMe, canStaffEditYouth, getYouthDetail, markYouthScheduleViewed, markYouthTimelineViewed } from '../../services/staffService'

export default function YouthDetailPage() {
  const { youthId } = useParams()
  const navigate = useNavigate()
  const { context } = useStaffSession()
  const [detail, setDetail] = useState(null)
  const [activeTab, setActiveTab] = useState('characteristics')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [dataVersion, setDataVersion] = useState(0)

  const loadDetail = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
    }
    setErrorMessage('')
    try {
      const data = await getYouthDetail(youthId)
      setDetail(data)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load youth details.')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [youthId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  useEffect(() => {
    if (activeTab !== 'timeline' || !youthId) return
    markYouthTimelineViewed(youthId).catch(() => {})
  }, [activeTab, youthId])

  useEffect(() => {
    if (activeTab !== 'schedule' || !youthId || detail?.isPending) return
    markYouthScheduleViewed(youthId).catch(() => {})
  }, [activeTab, youthId, detail?.isPending])

  useEffect(() => {
    let timeoutId
    function handleFocus() {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        loadDetail({ silent: true })
        setDataVersion((value) => value + 1)
      }, 250)
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadDetail])

  async function handleAssign() {
    setAssigning(true)
    try {
      await assignYouthToMe(youthId)
      await loadDetail({ silent: true })
      setDataVersion((v) => v + 1)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to assign youth.')
    } finally {
      setAssigning(false)
    }
  }

  const staffName = context?.staffProfile?.display_name || 'Staff'

  const staffProfileId = context?.staffProfile?.id
  const canManageCase = detail ? canStaffEditYouth(detail.youth, staffProfileId) : false

  if (loading && !detail) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading case details…</p>
      </div>
    )
  }

  if (errorMessage && !detail) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-rose-700">{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white lg:flex-row">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <StaffSidebar
        active={activeTab}
        onNavigate={setActiveTab}
        staffName={staffName}
        youthName={detail.name}
        onBack={() => navigate('/staff-dashboard')}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 lg:hidden">
          {[
            { id: 'characteristics', label: '🧩 Characteristics' },
            { id: 'timeline', label: '📅 Timeline' },
            { id: 'schedule', label: '🗓️ Schedule' },
            { id: 'offline', label: '📝 Offline' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${
                activeTab === item.id ? 'bg-sky-50 text-sky-700' : 'text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {detail.isPending && (
            <div className="mb-6">
              <PendingYouthCard
                youth={{
                  id: youthId,
                  name: detail.name,
                  riskLevel: resolveYouthRiskLevel({
                    insights: detail.insights,
                    aiSessions: detail.aiSessions,
                    offlineSessions: (detail.offlineSessions || []).filter((s) => s.status === 'approved'),
                  }),
                  currentConcern: resolveCurrentConcern({
                    insights: detail.insights,
                    questionnaire: detail.questionnaire,
                  }),
                  casePreview: resolveCasePreview({
                    insights: detail.insights,
                    sessions: detail.aiSessions,
                    youthName: detail.name,
                  }),
                }}
                onAssign={handleAssign}
                assigning={assigning}
                hideViewDetails
              />
            </div>
          )}

          {errorMessage && (
            <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          {activeTab === 'characteristics' && (
            <CharacteristicsTab
              detail={detail}
              refreshKey={dataVersion}
              staffProfileId={staffProfileId}
              canEdit={canManageCase}
            />
          )}
          {activeTab === 'timeline' && (
            <CaseTimelineTab
              detail={detail}
              refreshKey={dataVersion}
              staffProfileId={staffProfileId}
              canEdit={canManageCase}
            />
          )}
          {activeTab === 'schedule' && (
            <YouthScheduleTab
              detail={detail}
              staffId={staffProfileId}
              onUpdated={() => {
                loadDetail({ silent: true })
                setDataVersion((v) => v + 1)
              }}
            />
          )}
          {activeTab === 'offline' && (
            <OfflineSessionTab
              detail={detail}
              onUpdated={() => {
                loadDetail({ silent: true })
                setDataVersion((v) => v + 1)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}
