import { useEffect } from 'react'

export default function NewAssignmentDialog({
  open,
  workerName,
  onViewWorker,
  onRequestReassignment,
  onContinue,
}) {
  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') onContinue()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onContinue])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onContinue}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-assignment-title"
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl"
      >
        <h2 id="new-assignment-title" className="text-lg font-bold text-slate-900">
          You have a youth worker
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">{workerName}</span> has been assigned to
          support you. What would you like to do next?
        </p>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onViewWorker}
            className="flex w-full items-center justify-center rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            View assigned worker
          </button>
          <button
            type="button"
            onClick={onRequestReassignment}
            className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
          >
            Request a different worker
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Continue to portal
          </button>
        </div>
      </div>
    </div>
  )
}
