import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StaffTeamCard from '../../components/staff/StaffTeamCard'
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
    <div className="relative min-h-dvh overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/staff-dashboard" className="text-sm font-medium text-sky-600 hover:text-sky-700">
              ← Back to dashboard
            </Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-sky-600">Care Team</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">Staff Directory</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              View your colleagues&apos; profiles, see who each staff member supports, and check caseload sizes across
              the team.
            </p>
          </div>
        </header>

        {errorMessage && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500">Loading care team…</p>
        ) : (
          <>
            <section className="mb-8 grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
                <p className="text-sm font-medium text-sky-700">Team members</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{directory?.totals?.staffCount ?? 0}</p>
              </article>
              <article className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
                <p className="text-sm font-medium text-teal-700">Youth assigned across team</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {directory?.totals?.assignedYouthCount ?? 0}
                </p>
              </article>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-slate-800">All staff</h2>
              {directory?.staff?.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {directory.staff.map((member) => (
                    <StaffTeamCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                  <p className="text-slate-600">No staff profiles found yet.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
