import { useCallback, useEffect, useState } from 'react'
import ProfileEditButton from '../profile/ProfileEditButton'
import ProfileSummaryCard from '../profile/ProfileSummaryCard'
import StaffQuestionnaireProfileSection from '../profile/StaffQuestionnaireProfileSection'
import { mapStaffQuestionnaireToProfile } from '../profile/QuestionnaireProfileView'
import { useStaffSession } from '../../context/StaffSessionContext'
import { STAFF_PROFILE_LABELS } from '../../lib/profileLabels'
import {
  getStaffQuestionnaire,
  normalizeStaffQuestionnaireRow,
} from '../../services/staffQuestionnaireService'
import StaffProfileEditDrawer from './StaffProfileEditDrawer'

export default function StaffProfilePanel({ staffProfileId }) {
  const { context, refresh } = useStaffSession()
  const [questionnaire, setQuestionnaire] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const loadQuestionnaire = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getStaffQuestionnaire(staffProfileId)
      setQuestionnaire(data)
    } catch (err) {
      setError(err.message || 'Unable to load profile')
    } finally {
      setLoading(false)
    }
  }, [staffProfileId])

  useEffect(() => {
    loadQuestionnaire()
  }, [loadQuestionnaire])

  const profile = mapStaffQuestionnaireToProfile(questionnaire)
  const name =
    context?.staffProfile?.display_name ||
    context?.staffProfile?.email?.split('@')[0] ||
    'Youth Worker'
  const email = context?.staffProfile?.email || ''

  async function handleSaved(data) {
    setQuestionnaire(normalizeStaffQuestionnaireRow(data))
    await refresh()
  }

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{STAFF_PROFILE_LABELS.pageTitle}</h1>
            <p className="mt-2 text-slate-600">{STAFF_PROFILE_LABELS.pageSubtitle}</p>
          </div>
          <ProfileEditButton onClick={() => setEditOpen(true)} disabled={loading || !questionnaire} />
        </header>

        <ProfileSummaryCard
          badge={STAFF_PROFILE_LABELS.summaryBadge}
          name={name}
          email={email}
          icon="🧑‍💼"
        />

        <StaffQuestionnaireProfileSection
          profile={profile}
          loading={loading}
          error={error}
          loadingText="Loading profile…"
          emptyMessage="Profile sections will appear once you complete your onboarding questionnaire."
        />
      </div>

      <StaffProfileEditDrawer
        open={editOpen}
        questionnaire={questionnaire}
        staffProfileId={staffProfileId}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
