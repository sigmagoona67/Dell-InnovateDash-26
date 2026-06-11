import AuthCard from '../components/AuthCard'
import PageShell from '../components/PageShell'

export default function StaffAuth() {
  return (
    <PageShell
      badge="CareBridge AI · Staff Portal"
      title="Staff Authentication"
      subtitle="Securely access assigned youth case support tools and AI-assisted follow-up context."
    >
      <AuthCard role="staff" accent="sky" loginDestination="/staff-dashboard" />
    </PageShell>
  )
}
