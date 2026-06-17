import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { InfoCard, TagSection } from '../../components/staff/TagSection'
import TeamYouthCard from '../../components/staff/TeamYouthCard'
import { getStaffMemberDetail } from '../../services/staffTeamService'

function formatMemberSince(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export default function StaffMemberDetailPage() {
  const { staffId } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setErrorMessage('')
      try {
        const data = await getStaffMemberDetail(staffId)
        if (active) setDetail(data)
      } catch (error) {
        if (active) setErrorMessage(error.message || 'Unable to load staff profile.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [staffId])

  const questionnaire = detail?.questionnaire

  return (
    <div className="relative min-h-dvh overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-8">
          <Link to="/staff-dashboard/team" className="text-sm font-medium text-sky-600 hover:text-sky-700">
            ← Back to staff directory
          </Link>
        </header>

        {errorMessage && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500">Loading staff profile…</p>
        ) : detail ? (
          <>
            <section className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold text-slate-800">{detail.staff.name}</h1>
                    {detail.staff.isSelf && (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                        You
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-slate-600">{detail.staff.email}</p>
                  {detail.staff.memberSince && (
                    <p className="mt-1 text-sm text-slate-500">
                      Team member since {formatMemberSince(detail.staff.memberSince)}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4 text-center">
                  <p className="text-3xl font-bold text-slate-800">{detail.assignedYouthCount}</p>
                  <p className="text-sm font-medium text-teal-700">Youth assigned</p>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold text-slate-800">Staff profile</h2>
              {!questionnaire?.quiz_completed ? (
                <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-900">
                  This staff member has not completed their profile quiz yet.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <TagSection title="Connection interests" items={questionnaire.interests} />
                  <InfoCard
                    title="Personality"
                    items={[questionnaire.personalitySummary].filter(Boolean)}
                    accent="teal"
                  />
                  <TagSection
                    title="Communication approach"
                    items={questionnaire.preferred_communication_style}
                  />
                  <TagSection title="Supporting strengths" items={questionnaire.supporting_strengths} />
                  {questionnaire.additional_notes ? (
                    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
                      <h3 className="text-base font-bold text-slate-800">Additional notes</h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{questionnaire.additional_notes}</p>
                    </section>
                  ) : null}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Assigned youth</h2>
              {detail.assignedYouth.length ? (
                <>
                  <p className="mb-4 text-sm text-slate-500">
                    {detail.staff.isSelf
                      ? 'Open a youth card to view their full case file.'
                      : 'Read-only list of youth supported by this staff member.'}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {detail.assignedYouth.map((youth) => (
                      <TeamYouthCard key={youth.id} youth={youth} linkToDetail={detail.staff.isSelf} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                  <p className="text-slate-600">No youth assigned to this staff member yet.</p>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
