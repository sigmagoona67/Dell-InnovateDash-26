import QuestionnaireProfileView from './QuestionnaireProfileView'
import { STAFF_PROFILE_LABELS } from '../../lib/profileLabels'

export default function StaffQuestionnaireProfileSection({
  profile,
  loading = false,
  error = '',
  loadingText = 'Loading profile…',
  emptyMessage = 'Profile sections will appear once the onboarding questionnaire is complete.',
}) {
  if (loading) {
    return <p className="text-sm text-slate-500">{loadingText}</p>
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </p>
    )
  }

  if (profile) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <QuestionnaireProfileView
          basicInfo={profile.basicInfo}
          interests={profile.interests}
          communicationStyle={profile.communicationStyle}
          communicationTitle={STAFF_PROFILE_LABELS.communicationTitle}
          challenges={profile.challenges}
          challengesTitle={STAFF_PROFILE_LABELS.challengesTitle}
        />
      </section>
    )
  }

  return (
    <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
      {emptyMessage}
    </p>
  )
}
