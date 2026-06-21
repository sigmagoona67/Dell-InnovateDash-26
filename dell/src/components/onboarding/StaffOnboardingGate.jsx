import { Navigate, useLocation } from 'react-router-dom'
import { useStaffSession } from '../../context/StaffSessionContext'

export function StaffOnboardingGate({ children }) {
  const { context } = useStaffSession()
  const location = useLocation()

  const completed = Boolean(context?.onboardingComplete)
  const onOnboarding = location.pathname.includes('/onboarding')

  if (!completed && !onOnboarding) {
    return <Navigate to="/staff-dashboard/onboarding" replace />
  }

  if (completed && onOnboarding) {
    return <Navigate to="/staff-dashboard" replace />
  }

  return children
}
