import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CaseTimelineTab from '../../components/staff/CaseTimelineTab'
import CharacteristicsTab from '../../components/staff/CharacteristicsTab'
import OfflineSessionTab from '../../components/staff/OfflineSessionTab'
import StaffSidebar from '../../components/staff/StaffSidebar'
import PendingYouthCard from '../../components/staff/PendingYouthCard'
import { AlertTriangle, UserMinus } from 'lucide-react'
import { Button, Skeleton } from '../../components/ui'
import { useStaffSession } from '../../context/StaffSessionContext'
import { assignYouthToMe, getYouthDetail, releaseYouth } from '../../services/staffService'

export default function YouthDetailPage() {
  const { youthId } = useParams()
  const navigate = useNavigate()
  const { context } = useStaffSession()
  const [detail, setDetail] = useState(null)
  const [activeTab, setActiveTab] = useState('characteristics')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await getYouthDetail(youthId)
      setDetail(data)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load youth details.')
    } finally {
      setLoading(false)
    }
  }, [youthId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  async function handleAssign() {
    setAssigning(true)
    try {
      await assignYouthToMe(youthId)
      await loadDetail()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to assign youth.')
    } finally {
      setAssigning(false)
    }
  }

  async function handleRelease() {
    setReleasing(true)
    setErrorMessage('')
    try {
      await releaseYouth(youthId)
      navigate('/staff-dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to release this youth.')
      setReleaseOpen(false)
    } finally {
      setReleasing(false)
    }
  }

  const staffName = context?.staffProfile?.display_name || 'Staff'

  if (loading) {
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        className="mx-auto min-h-dvh max-w-3xl space-y-4 bg-slate-50 px-6 py-10"
      >
        <span className="sr-only">Loading youth profile…</span>
        <Skeleton variant="line" className="w-1/3" />
        <Skeleton variant="block" />
        <Skeleton variant="block" />
      </div>
    )
  }

  if (errorMessage && !detail) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-6">
        <p role="alert" className="text-[15px] text-danger-700">
          {errorMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-50 lg:flex-row">
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
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          {[
            { id: 'characteristics', label: 'Profile' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'offline', label: 'Offline' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`shrink-0 rounded-control px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${
                activeTab === item.id ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:text-sky-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {detail.isAssigned && (
            <div className="mb-4 flex justify-end">
              <Button variant="secondary" accent="sky" size="sm" onClick={() => setReleaseOpen(true)}>
                <UserMinus className="h-4 w-4" aria-hidden="true" />
                Release case
              </Button>
            </div>
          )}

          {detail.isPending && (
            <div className="mb-6">
              <PendingYouthCard
                youth={{
                  id: youthId,
                  name: detail.name,
                  riskLevel: detail.insights?.risk_level || 'low',
                  currentChallenges: detail.questionnaire?.current_challenges,
                  aiSummary: detail.insights?.latest_change || 'Preview mode — assign to manage this case.',
                }}
                onAssign={handleAssign}
                assigning={assigning}
                hideViewDetails
              />
            </div>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="mb-4 rounded-card border border-danger-100 bg-danger-100/50 px-4 py-3 text-[13px] text-danger-700"
            >
              {errorMessage}
            </p>
          )}

          {activeTab === 'characteristics' && <CharacteristicsTab detail={detail} />}
          {activeTab === 'timeline' && <CaseTimelineTab detail={detail} />}
          {activeTab === 'offline' && <OfflineSessionTab detail={detail} onUpdated={loadDetail} />}
        </main>
      </div>

      {releaseOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-4"
          onClick={() => !releasing && setReleaseOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="release-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-panel bg-white p-6 shadow-float sm:p-8"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-warning-100 text-warning-500"
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 id="release-title" className="font-display text-[20px] font-semibold leading-tight text-ink-800">
                  Release {detail.name} from your caseload?
                </h2>
                <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
                  They’ll return to the unassigned pool so another worker can pick them up. Their history and AI insights are kept.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" accent="sky" onClick={() => setReleaseOpen(false)} disabled={releasing}>
                Cancel
              </Button>
              <Button accent="sky" loading={releasing} onClick={handleRelease}>
                Release case
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
