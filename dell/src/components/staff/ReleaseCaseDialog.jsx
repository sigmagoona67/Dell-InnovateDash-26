import { useEffect } from 'react'

export default function ReleaseCaseDialog({
  open,
  youthName,
  releasing = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape' && !releasing) onCancel()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onCancel, releasing])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close release case dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={releasing ? undefined : onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-case-title"
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl"
      >
        <h2 id="release-case-title" className="text-lg font-bold text-slate-900">
          Release Case
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Release <span className="font-semibold text-slate-800">{youthName}</span> back to the
          unassigned pool? You will no longer be their assigned worker.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={releasing}
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={releasing}
            onClick={onConfirm}
            className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {releasing ? 'Releasing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
