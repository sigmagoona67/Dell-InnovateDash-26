import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatAppDate } from '../../lib/locale'
import { mapStaffQuestionnaireToProfile } from '../../components/profile/QuestionnaireProfileView'
import StaffQuestionnaireProfileSection from '../../components/profile/StaffQuestionnaireProfileSection'
import TeamYouthCard from '../../components/staff/TeamYouthCard'
import { STAFF_PROFILE_LABELS } from '../../lib/profileLabels'
import { getStaffMemberDetail } from '../../services/staffTeamService'

function formatMemberSince(iso) {
  return formatAppDate(iso, { month: 'long', year: 'numeric' })
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
  const profile = mapStaffQuestionnaireToProfile(questionnaire)

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <main className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/staff-dashboard/team"
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            ← Back to staff directory
          </Link>

          {errorMessage && (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Loading staff profile…</p>
          ) : detail ? (
            <>
              <header className="mb-6 mt-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{detail.staff.name}</h1>
                  <p className="mt-2 text-slate-600">
                    {detail.staff.isSelf
                      ? STAFF_PROFILE_LABELS.pageSubtitle
                      : 'Worker profile and assigned caseload for this team member.'}
                  </p>
                </div>
              </header>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
                      🧑‍💼
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-teal-600">
                        {detail.staff.isSelf ? STAFF_PROFILE_LABELS.summaryBadge : 'Staff Member'}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-800">{detail.staff.name}</h2>
                        {detail.staff.isSelf && (
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
                            You
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{detail.staff.email}</p>
                      {detail.staff.memberSince && (
                        <p className="mt-1 text-sm text-slate-500">
                          Team member since {formatMemberSince(detail.staff.memberSince)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4 text-center">
                    <p className="text-3xl font-bold text-slate-800">{detail.assignedYouthCount}</p>
                    <p className="text-sm font-medium text-teal-700">Youth assigned</p>
                  </div>
                </div>
              </div>

              <section className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-slate-800">Staff profile</h2>
                {!questionnaire?.profileComplete ? (
                  <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This staff member has not completed their profile quiz yet.
                  </p>
                ) : (
                  <StaffQuestionnaireProfileSection
                    profile={profile}
                    loading={false}
                    emptyMessage="Profile sections will appear once the onboarding questionnaire is complete."
                  />
                )}
              </section>

              <section>
                <h2 className="mb-2 text-lg font-bold text-slate-800">Assigned youth</h2>
                <p className="mb-4 text-sm text-slate-600">
                  {detail.staff.isSelf
                    ? 'Open a youth card to view their full case file. Sorted by risk level (high to low).'
                    : 'Read-only list of youth supported by this staff member. Sorted by risk level (high to low).'}
                </p>
                {detail.assignedYouth.length ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {detail.assignedYouth.map((youth) => (
                        <TeamYouthCard key={youth.id} youth={youth} linkToDetail={detail.staff.isSelf} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-slate-100 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
                    No youth assigned to this staff member yet.
                  </p>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
