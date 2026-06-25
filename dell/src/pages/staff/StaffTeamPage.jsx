import { useEffect, useState } from 'react'
import StaffNav from '../../components/staff/StaffNav'
import StaffTeamCard from '../../components/staff/StaffTeamCard'
import { Card, Skeleton } from '../../components/ui'
import { getStaffDirectory } from '../../services/staffTeamService'

export default function StaffTeamPage() {
  const [directory, setDirectory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setErrorMessage('')
      try {
        const data = await getStaffDirectory()
        if (active) setDirectory(data)
      } catch (error) {
        if (active) setErrorMessage(error.message || 'Unable to load care team.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <StaffNav />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-10">
        <header className="mb-8">
          <p className="text-[12px] font-medium uppercase tracking-wide text-sky-600">Care Team</p>
          <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] text-ink-800">
            Staff Directory
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            View your colleagues&apos; profiles, see who each staff member supports, and check caseload capacity and
            risk mix across the team.
          </p>
        </header>

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-card border border-danger-100 bg-danger-100/50 px-4 py-3 text-[13px] text-danger-700"
          >
            {errorMessage}
          </p>
        )}

        {loading ? (
          <div aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading care team…</span>
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <Skeleton variant="block" className="h-24" />
              <Skeleton variant="block" className="h-24" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="block" className="h-48" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-4 sm:grid-cols-2">
              <Card className="bg-sky-50">
                <p className="text-[13px] font-medium text-sky-600">Team members</p>
                <p className="mt-2 font-display text-[30px] font-bold text-ink-800">
                  {directory?.totals?.staffCount ?? 0}
                </p>
              </Card>
              <Card className="bg-teal-50">
                <p className="text-[13px] font-medium text-teal-600">Youth assigned across team</p>
                <p className="mt-2 font-display text-[30px] font-bold text-ink-800">
                  {directory?.totals?.assignedYouthCount ?? 0}
                </p>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 font-display text-[22px] font-semibold text-ink-800">All staff</h2>
              {directory?.staff?.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {directory.staff.map((member) => (
                    <StaffTeamCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <Card padding="lg" className="text-center">
                  <p className="text-[15px] text-slate-600">No staff profiles found yet.</p>
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
