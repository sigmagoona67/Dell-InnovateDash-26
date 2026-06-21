import { useEffect, useState } from 'react'
import { mapStaffQuestionnaireToProfile } from '../profile/QuestionnaireProfileView'
import ProfileSummaryCard from '../profile/ProfileSummaryCard'
import StaffQuestionnaireProfileSection from '../profile/StaffQuestionnaireProfileSection'
import { YOUTH_PROFILE_LABELS } from '../../lib/profileLabels'
import { getStaffQuestionnaire } from '../../services/staffQuestionnaireService'

export default function AssignedWorkerPanel({ workerView, assignedStaff }) {
  const assignedStaffProfileId = assignedStaff?.id
  const [questionnaire, setQuestionnaire] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!workerView.hasAssignedWorker || !assignedStaffProfileId) return

    let cancelled = false
    setLoading(true)
    setError('')
    getStaffQuestionnaire(assignedStaffProfileId)
      .then((data) => {
        if (!cancelled) setQuestionnaire(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load worker profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [workerView.hasAssignedWorker, assignedStaffProfileId])

  if (!workerView.hasAssignedWorker) {
    return (
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Assigned Worker</h1>
          <p className="mt-2 text-slate-600">We are finding the right person to support you.</p>
        </header>

        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-3xl">
            👩
          </div>
          <p className="mb-2 text-sm font-medium text-sky-600">Status</p>
          <p className="mb-6 text-xl font-bold text-slate-800">{workerView.status}</p>
          <p className="text-sm leading-relaxed text-slate-600">{workerView.message}</p>
        </div>
      </div>
    )
  }

  const profile = mapStaffQuestionnaireToProfile(questionnaire)
  const name = workerView.name || assignedStaff?.display_name || 'Youth Worker'
  const email = assignedStaff?.email || ''

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Assigned Worker</h1>
        <p className="mt-2 text-slate-600">{YOUTH_PROFILE_LABELS.assignedWorkerSubtitle}</p>
      </header>

      <ProfileSummaryCard
        badge={YOUTH_PROFILE_LABELS.assignedWorkerBadge}
        name={name}
        email={email}
        icon="👩"
      />

      <StaffQuestionnaireProfileSection
        profile={profile}
        loading={loading}
        error={error}
        loadingText="Loading worker profile…"
        emptyMessage="Detailed profile sections will appear once your worker completes their onboarding questionnaire."
      />
    </div>
  )
}
