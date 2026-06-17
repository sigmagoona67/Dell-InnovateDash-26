import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { StaffAuthGate, StaffSessionProvider, useStaffSession } from '../../context/StaffSessionContext'
import StaffDashboardHome from './StaffDashboardHome'
import StaffProfileQuiz from './StaffProfileQuiz'
import YouthDetailPage from './YouthDetailPage'

function StaffQuizGate({ children }) {
  const { context, loading } = useStaffSession()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading staff workspace...</p>
      </div>
    )
  }

  const onQuizRoute = location.pathname.includes('/profile-quiz')
  const quizCompleted = context?.staffQuestionnaire?.quiz_completed

  if (!quizCompleted && !onQuizRoute) {
    return <Navigate to="/staff-dashboard/profile-quiz" replace />
  }

  return children
}

export default function StaffLayout() {
  return (
    <StaffSessionProvider>
      <StaffAuthGate>
        <StaffQuizGate>
          <Routes>
            <Route index element={<StaffDashboardHome />} />
            <Route path="profile-quiz" element={<StaffProfileQuiz />} />
            <Route path="youth/:youthId" element={<YouthDetailPage />} />
            <Route path="*" element={<Navigate to="/staff-dashboard" replace />} />
          </Routes>
        </StaffQuizGate>
      </StaffAuthGate>
    </StaffSessionProvider>
  )
}
