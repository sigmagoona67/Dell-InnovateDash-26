import { Navigate, Route, Routes } from 'react-router-dom'
import { StaffAuthGate, StaffSessionProvider } from '../../context/StaffSessionContext'
import StaffDashboardHome from './StaffDashboardHome'
import YouthDetailPage from './YouthDetailPage'

export default function StaffLayout() {
  return (
    <StaffSessionProvider>
      <StaffAuthGate>
        <Routes>
          <Route index element={<StaffDashboardHome />} />
          <Route path="youth/:youthId" element={<YouthDetailPage />} />
          <Route path="*" element={<Navigate to="/staff-dashboard" replace />} />
        </Routes>
      </StaffAuthGate>
    </StaffSessionProvider>
  )
}
