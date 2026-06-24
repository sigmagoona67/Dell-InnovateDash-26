import { useEffect } from 'react'
import { getReassignmentReasonLabel } from '../../lib/reassignmentReasons'

export default function ReassignmentConfirmDialog({
  open,
  reason,
  confirming = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape' && !confirming) onCancel()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onCancel, confirming])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close reassignment dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={confirming ? undefined : onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassignment-confirm-title"
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl"
      >
        <h2 id="reassignment-confirm-title" className="text-lg font-bold text-slate-900">
          Notify your youth worker?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your worker will see that you would like a different match. They can release your case so
          a new worker can be assigned.
        </p>
        {reason && (
          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Reason</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{getReassignmentReasonLabel(reason)}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={confirming}
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {confirming ? 'Sending…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
