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
        await refresh()
        navigate('/youth-chat/portal', { replace: true })
      }}
    />
  )
}
