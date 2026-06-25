import { Navigate, useNavigate } from 'react-router-dom'
import StaffQuestionnaireForm, {
  buildStaffQuestionnairePayload,
} from '../../components/staff/StaffQuestionnaireForm'
import { useStaffSession } from '../../context/StaffSessionContext'
import { completeStaffOnboarding } from '../../services/staffQuestionnaireService'

export default function StaffOnboarding() {
  const { context, refresh } = useStaffSession()
  const navigate = useNavigate()

  if (context?.onboardingComplete) {
    return <Navigate to="/staff-dashboard" replace />
  }

  if (!context?.staffProfile?.id) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading staff profile…</p>
      </div>
    )
  }

  return (
    <StaffQuestionnaireForm
      questionnaire={context?.questionnaire}
      staffProfileId={context.staffProfile.id}
      badge="CareBridge AI · Staff onboarding"
      reviewSubtitle={
        context?.questionnaire && !context?.onboardingComplete
          ? 'We have updated our profile questions. Please review your answers and submit.'
          : null
      }
      onSubmit={async (payload) => completeStaffOnboarding(context.staffProfile.id, payload)}
      onSaved={async () => {
        await refresh({ revalidateOnboarding: true })
        navigate('/staff-dashboard', { replace: true })
      }}
    />
  )
}
