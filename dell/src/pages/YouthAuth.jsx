import AuthCard from '../components/AuthCard'
import PageShell from '../components/PageShell'

export default function YouthAuth() {
  return (
    <PageShell
      badge="CareBridge AI · Youth Portal"
      title="Youth Authentication"
      subtitle="Enter a safe, supportive after-hours space while your trusted youth worker follows up."
    >
      <AuthCard role="youth" accent="teal" loginDestination="/youth-chat" />
    </PageShell>
  )
}
