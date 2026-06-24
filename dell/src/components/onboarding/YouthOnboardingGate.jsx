import { Navigate, useLocation } from 'react-router-dom'
import { useYouthSession } from '../../context/YouthSessionContext'

export function YouthOnboardingGate({ children }) {
  const { context } = useYouthSession()
  const location = useLocation()

  const completed = Boolean(context?.onboardingComplete)
  const onOnboarding = location.pathname.includes('/onboarding')

  if (!completed && !onOnboarding) {
    return <Navigate to="/youth-chat/onboarding" replace />
  }

  if (completed && onOnboarding) {
    return <Navigate to={`/youth-chat/portal${location.search}`} replace />
  }

  return children
}
