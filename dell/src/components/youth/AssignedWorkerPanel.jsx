import { UserRound } from 'lucide-react'
import { StatusPill } from '../ui'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] font-medium text-slate-500">{label}</span>
      <span className="text-[15px] font-bold text-slate-800">{value}</span>
    </div>
  )
}

export default function AssignedWorkerPanel({ workerView }) {
  if (!workerView.hasAssignedWorker) {
    return (
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <h1 className="font-display text-[30px] font-bold leading-[1.1] text-ink-800">Assigned worker</h1>
          <p className="mt-2 text-[15px] leading-[1.55] text-slate-600">
            We&apos;re finding the right person to support you.
          </p>
        </header>

        <div className="rounded-card border border-slate-200 bg-white p-8 text-center shadow-card">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-teal-50 text-teal-600"
          >
            <UserRound className="h-7 w-7" />
          </div>
          <p className="mb-2 text-[13px] font-medium text-slate-500">Status</p>
          <div className="mb-6 flex justify-center">
            <StatusPill status={workerView.status}>{workerView.status}</StatusPill>
          </div>
          <p className="text-[15px] leading-[1.55] text-slate-600">{workerView.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-6">
        <h1 className="font-display text-[30px] font-bold leading-[1.1] text-ink-800">Assigned worker</h1>
        <p className="mt-2 text-[15px] leading-[1.55] text-slate-600">
          Your trusted youth worker for ongoing support.
        </p>
      </header>

      <div className="rounded-card border border-slate-200 bg-white p-8 shadow-card">
        <p className="mb-1 text-[13px] font-medium text-teal-600">Assigned youth worker</p>
        <h2 className="mb-6 font-display text-[22px] font-semibold text-ink-800">{workerView.name}</h2>

        <div className="rounded-card bg-slate-50 px-4">
          <div className="flex items-center justify-between border-b border-slate-200 py-3">
            <span className="text-[13px] font-medium text-slate-500">Status</span>
            <StatusPill status={workerView.status}>{workerView.status}</StatusPill>
          </div>
          <InfoRow label="Working hours" value={workerView.workingHours} />
          <InfoRow label="Last follow-up" value={workerView.lastFollowUp} />
          <InfoRow label="Next suggested follow-up" value={workerView.nextFollowUp} />
        </div>

        <p className="mt-6 rounded-card border border-teal-100 bg-teal-50 px-4 py-3 text-[15px] leading-[1.55] text-slate-800">
          {workerView.message}
        </p>
      </div>
    </div>
  )
}
