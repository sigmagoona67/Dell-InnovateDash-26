import { Link } from 'react-router-dom'

export default function StaffTeamCard({ member }) {
  const initials = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

  return (
    <Link
      to={`/staff-dashboard/team/${member.id}`}
      className="group block rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-sky-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-teal-100 text-lg font-bold text-sky-800">
          {initials || 'S'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800 group-hover:text-sky-700">{member.name}</h3>
            {member.isSelf && (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                You
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{member.email}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {member.assignedYouthCount} youth assigned
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                member.quizCompleted
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                  : 'bg-amber-50 text-amber-800 ring-amber-200'
              }`}
            >
              {member.quizCompleted ? 'Profile complete' : 'Profile incomplete'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
