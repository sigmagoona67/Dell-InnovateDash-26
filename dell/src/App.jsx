import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import StaffDashboard from './pages/StaffDashboard'
import StaffAuth from './pages/StaffAuth'
import StaffSignup from './pages/StaffSignup'
import YouthAuth from './pages/YouthAuth'
import YouthChat from './pages/YouthChat'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/staff-auth" element={<StaffAuth />} />
      <Route path="/staff-signup" element={<StaffSignup />} />
      <Route path="/youth-auth" element={<YouthAuth />} />
      <Route path="/staff-dashboard/*" element={<StaffDashboard />} />
      <Route path="/youth-chat/*" element={<YouthChat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
