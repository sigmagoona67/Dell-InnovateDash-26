import { Navigate, useNavigate } from 'react-router-dom'
import YouthQuestionnaireForm from '../../components/youth/YouthQuestionnaireForm'
import { useYouthSession } from '../../context/YouthSessionContext'
import { completeOnboarding } from '../../services/questionnaireService'

export default function YouthOnboarding() {
  const { context, refresh } = useYouthSession()
  const navigate = useNavigate()

  if (context?.onboardingComplete) {
    return <Navigate to="/youth-chat/portal" replace />
  }

  if (!context?.youth?.id) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading your profile...</p>
      </div>
    )
  }

  return (
    <YouthQuestionnaireForm
      questionnaire={context?.questionnaire}
      youthId={context.youth.id}
      reviewSubtitle={
        context?.questionnaire && !context?.onboardingComplete
          ? 'We have updated our profile questions. Please review your answers and submit.'
          : null
      }
      onSubmit={async (payload) =>
        completeOnboarding(context.youth.id, payload, {
          preferredName: context.displayName || context.youth.preferred_name,
        })
      }
      onSaved={async () => {
        await refresh({ revalidateOnboarding: true })
        navigate('/youth-chat/portal', { replace: true })
      }}
    />
  )
}
