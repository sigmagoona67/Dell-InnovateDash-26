import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import StaffNav from '../../components/staff/StaffNav'
import { InfoCard, TagSection } from '../../components/staff/TagSection'
import TeamYouthCard from '../../components/staff/TeamYouthCard'
import { Card, Skeleton } from '../../components/ui'
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
    <div className="relative min-h-dvh overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <StaffNav />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-10">
        <header className="mb-8">
          <Link
            to="/staff-dashboard/team"
            className="inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-[13px] font-medium text-sky-600 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to staff directory
          </Link>
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
          <div aria-live="polite" aria-busy="true" className="space-y-4">
            <span className="sr-only">Loading staff profile…</span>
            <Skeleton variant="block" className="h-28" />
            <Skeleton variant="block" />
          </div>
        ) : detail ? (
          <>
            <Card padding="lg" className="mb-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-[30px] font-bold leading-[1.1] text-ink-800">
                      {detail.staff.name}
                    </h1>
                    {detail.staff.isSelf && (
                      <span className="rounded-pill bg-sky-50 px-2.5 py-1 text-[12px] font-semibold text-sky-600">
                        You
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[15px] text-slate-600">{detail.staff.email}</p>
                  {detail.staff.memberSince && (
                    <p className="mt-1 text-[13px] text-slate-500">
                      Team member since {formatMemberSince(detail.staff.memberSince)}
                    </p>
                  )}
                </div>
                <div className="rounded-control bg-teal-50 px-5 py-4 text-center">
                  <p className="font-display text-[30px] font-bold text-ink-800">{detail.assignedYouthCount}</p>
                  <p className="text-[13px] font-medium text-teal-600">Youth assigned</p>
                </div>
              </div>
            </Card>

            <section className="mb-10">
              <h2 className="mb-4 font-display text-[22px] font-semibold text-ink-800">Staff profile</h2>
              {!questionnaire?.quiz_completed ? (
                <Card padding="lg" className="text-[13px] text-slate-600">
                  This staff member has not completed their profile quiz yet.
                </Card>
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
                    <Card as="section" className="lg:col-span-2">
                      <h3 className="font-display text-[18px] font-semibold text-ink-800">Additional notes</h3>
                      <p className="mt-3 text-[15px] leading-[1.55] text-slate-600">
                        {questionnaire.additional_notes}
                      </p>
                    </Card>
                  ) : null}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 font-display text-[22px] font-semibold text-ink-800">Assigned youth</h2>
              {detail.assignedYouth.length ? (
                <>
                  <p className="mb-4 text-[13px] text-slate-500">
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
                <Card padding="lg" className="text-center">
                  <p className="text-[15px] text-slate-600">No youth assigned to this staff member yet.</p>
                </Card>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
