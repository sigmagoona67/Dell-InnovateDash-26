import AuthCard from '../components/AuthCard'
import PageShell from '../components/PageShell'

export default function YouthAuth() {
  return (
    <PageShell
      accent="teal"
      badge="CareBridge AI · Youth Portal"
      title="Welcome to your space"
      subtitle="A safe, supportive place to talk after hours — your trusted youth worker is never far away."
    >
      <AuthCard role="youth" accent="teal" loginDestination="/youth-chat" />
    </PageShell>
  )
}
