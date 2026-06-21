export default function ProfileSummaryCard({ badge, name, email, icon = '👤' }) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-teal-600">{badge}</p>
          <h2 className="text-2xl font-bold text-slate-800">{name}</h2>
          {email && <p className="mt-1 text-sm text-slate-600">{email}</p>}
        </div>
      </div>
    </div>
  )
}
