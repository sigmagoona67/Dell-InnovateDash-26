import { Navigate, Route, Routes } from 'react-router-dom'
import { StaffAuthGate, StaffSessionProvider } from '../../context/StaffSessionContext'
import { StaffOnboardingGate } from '../../components/onboarding/StaffOnboardingGate'
import StaffDashboardHome from './StaffDashboardHome'
import StaffOnboarding from './StaffOnboarding'
import StaffProfilePage from './StaffProfilePage'
import YouthDetailPage from './YouthDetailPage'

export default function StaffLayout() {
  return (
    <StaffSessionProvider>
      <StaffAuthGate>
        <StaffOnboardingGate>
          <Routes>
            <Route index element={<StaffDashboardHome />} />
            <Route path="onboarding" element={<StaffOnboarding />} />
            <Route path="profile" element={<StaffProfilePage />} />
            <Route path="youth/:youthId" element={<YouthDetailPage />} />
            <Route path="*" element={<Navigate to="/staff-dashboard" replace />} />
          </Routes>
        </StaffOnboardingGate>
      </StaffAuthGate>
    </StaffSessionProvider>
  )
}
