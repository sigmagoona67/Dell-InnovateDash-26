import { Link } from 'react-router-dom'
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

      <p className="mt-4 text-center text-[13px] text-slate-500">
        New to the team?{' '}
        <Link
          to="/staff-signup"
          className="font-medium text-sky-600 underline-offset-2 transition hover:text-sky-700 hover:underline"
        >
          Create a staff account
        </Link>
      </p>
    </PageShell>
  )
}
