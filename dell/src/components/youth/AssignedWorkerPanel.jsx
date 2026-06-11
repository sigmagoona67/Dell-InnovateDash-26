function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )
}

export default function AssignedWorkerPanel({ workerView }) {
  if (!workerView.hasAssignedWorker) {
    return (
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Assigned Worker</h1>
          <p className="mt-2 text-slate-600">We are finding the right person to support you.</p>
        </header>

        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-3xl">
            👩
          </div>
          <p className="mb-2 text-sm font-medium text-sky-600">Status</p>
          <p className="mb-6 text-xl font-bold text-slate-800">{workerView.status}</p>
          <p className="text-sm leading-relaxed text-slate-600">{workerView.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Assigned Worker</h1>
        <p className="mt-2 text-slate-600">Your trusted youth worker for ongoing support.</p>
      </header>

      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)]">
        <p className="mb-1 text-sm font-medium text-teal-600">Assigned Youth Worker</p>
        <h2 className="mb-6 text-2xl font-bold text-slate-800">{workerView.name}</h2>

        <div className="rounded-2xl bg-slate-50/80 px-4">
          <InfoRow label="Status" value={workerView.status} />
          <InfoRow label="Working Hours" value={workerView.workingHours} />
          <InfoRow label="Last Follow-up" value={workerView.lastFollowUp} />
          <InfoRow label="Next Suggested Follow-up" value={workerView.nextFollowUp} />
        </div>

        <p className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm leading-relaxed text-teal-800">
          {workerView.message}
        </p>
      </div>
    </div>
  )
}
