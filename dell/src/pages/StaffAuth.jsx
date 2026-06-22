import AuthCard from '../components/AuthCard'
import PageShell from '../components/PageShell'
import { useLocation } from 'react-router-dom'

export default function StaffAuth() {
  const location = useLocation()
  const notice = location.state?.message

  return (
    <PageShell
      badge="CareBridge AI · Staff Portal"
      title="Staff Authentication"
      subtitle="Securely access assigned youth case support tools and AI-assisted follow-up context."
    >
      {notice && (
        <p className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {notice}
        </p>
      )}
      <AuthCard
        role="staff"
        accent="sky"
        loginDestination="/staff-dashboard"
        allowSignUp={false}
        signUpLink="/staff-signup"
      />
    </PageShell>
  )
}
