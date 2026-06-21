import { useEffect, useState } from 'react'
import QuestionnaireProfileView, {
  mapYouthQuestionnaireToProfile,
} from '../profile/QuestionnaireProfileView'
import { getQuestionnaire } from '../../services/questionnaireService'

export default function YouthProfilePanel({ youthId }) {
  const [questionnaire, setQuestionnaire] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getQuestionnaire(youthId)
      .then((data) => {
        if (!cancelled) setQuestionnaire(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [youthId])

  const profile = mapYouthQuestionnaireToProfile(questionnaire)

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="mt-2 text-slate-600">Your onboarding answers, used for matching and support.</p>
      </header>

      {loading && <p className="text-sm text-slate-500">Loading profile…</p>}
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      {!loading && profile && (
        <QuestionnaireProfileView
          basicInfo={profile.basicInfo}
          interests={profile.interests}
          communicationStyle={profile.communicationStyle}
          challenges={profile.challenges}
          workerPrefs={profile.workerPrefs}
        />
      )}
    </div>
  )
}
