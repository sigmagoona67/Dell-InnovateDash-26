import { Route, Routes } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import PlaceholderCard from './components/PlaceholderCard'
import StaffDashboard from './pages/StaffDashboard'
import StaffAuth from './pages/StaffAuth'
import YouthAuth from './pages/YouthAuth'
import YouthChat from './pages/YouthChat'

function NotFound() {
  return (
    <PlaceholderCard
      badge="Page not found"
      title="We couldn't find that page"
      description="The page you're looking for doesn't exist or may have moved. Let's get you back to a safe place."
      actionLabel="Choose a portal"
      actionTo="/"
    />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/staff-auth" element={<StaffAuth />} />
      <Route path="/youth-auth" element={<YouthAuth />} />
      <Route path="/staff-dashboard/*" element={<StaffDashboard />} />
      <Route path="/youth-chat/*" element={<YouthChat />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
