import { useEffect, useState } from 'react'

function EditIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function EditableSection({
  title,
  hint,
  value = '',
  mode = 'textarea',
  tagHint = 'One item per line',
  staffEdited = false,
  disabled = false,
  onSave,
  children,
  className = '',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(value)
    setError('')
    setEditing(false)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {title && <h4 className="text-sm font-bold text-slate-800">{title}</h4>}
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {staffEdited && !editing && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
              Staff edited
            </span>
          )}
          {!editing && !disabled && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 shadow-sm transition hover:bg-teal-50"
            >
              <EditIcon />
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          {mode === 'textarea' ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          ) : (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder={tagHint}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <p className="mt-1 text-xs text-slate-400">{tagHint}</p>
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
