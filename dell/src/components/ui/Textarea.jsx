import { useId } from 'react'

const ACCENT_RING = {
  teal: 'focus-visible:ring-teal-500',
  sky: 'focus-visible:ring-sky-500',
}

const FIELD_BASE =
  'w-full rounded-control border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 ' +
  'outline-none transition placeholder:text-slate-400 resize-y ' +
  'focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'

/**
 * Labeled textarea. EVERY field has a visible or sr-only <label>.
 */
export default function Textarea({
  label,
  hint,
  accent = 'sky',
  srLabel = false,
  id,
  className = '',
  rows = 4,
  ...rest
}) {
  const reactId = useId()
  const fieldId = id || reactId
  const ring = ACCENT_RING[accent] || ACCENT_RING.sky
  const hintId = hint ? `${fieldId}-hint` : undefined

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={fieldId}
          className={
            srLabel
              ? 'sr-only'
              : 'mb-1.5 block text-[13px] font-medium text-slate-600'
          }
        >
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        aria-describedby={hintId}
        className={`${FIELD_BASE} ${ring}`}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs font-medium text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}
