import { useCallback, useEffect, useState } from 'react'
import ProfileEditButton from '../profile/ProfileEditButton'
import ProfileSummaryCard from '../profile/ProfileSummaryCard'
import QuestionnaireProfileView, {
  mapYouthQuestionnaireToProfile,
} from '../profile/QuestionnaireProfileView'
import { useYouthSession } from '../../context/YouthSessionContext'
import { YOUTH_PROFILE_LABELS } from '../../lib/profileLabels'
import { getQuestionnaire, normalizeQuestionnaireRow } from '../../services/questionnaireService'
import YouthProfileEditDrawer from './YouthProfileEditDrawer'

export default function YouthProfilePanel({ youthId }) {
  const { context, refresh } = useYouthSession()
  const [questionnaire, setQuestionnaire] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const loadQuestionnaire = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getQuestionnaire(youthId)
      setQuestionnaire(data)
    } catch (err) {
      setError(err.message || 'Unable to load profile')
    } finally {
      setLoading(false)
    }
  }, [youthId])

  useEffect(() => {
    loadQuestionnaire()
  }, [loadQuestionnaire])

  const profile = mapYouthQuestionnaireToProfile(questionnaire)
  const name = context?.displayName || 'Youth'
  const email = context?.user?.email || context?.profile?.email || ''

  async function handleSaved(data) {
    setQuestionnaire(normalizeQuestionnaireRow(data))
    await refresh({ silent: true })
  }

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{YOUTH_PROFILE_LABELS.pageTitle}</h1>
            <p className="mt-2 text-slate-600">{YOUTH_PROFILE_LABELS.pageSubtitle}</p>
          </div>
          <ProfileEditButton onClick={() => setEditOpen(true)} disabled={loading || !questionnaire} />
        </header>

        <ProfileSummaryCard badge={YOUTH_PROFILE_LABELS.summaryBadge} name={name} email={email} icon="👤" />

        {loading && <p className="text-sm text-slate-500">Loading profile…</p>}
        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        {!loading && profile && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <QuestionnaireProfileView
              basicInfo={profile.basicInfo}
              interests={profile.interests}
              communicationStyle={profile.communicationStyle}
              communicationTitle={YOUTH_PROFILE_LABELS.communicationTitle}
              challenges={profile.challenges}
              challengesTitle={YOUTH_PROFILE_LABELS.challengesTitle}
              workerPrefs={profile.workerPrefs}
            />
          </section>
        )}
      </div>

      <YouthProfileEditDrawer
        open={editOpen}
        questionnaire={questionnaire}
        youthId={youthId}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
