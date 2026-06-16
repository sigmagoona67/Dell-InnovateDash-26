import { useState } from 'react'
import { Link } from 'react-router-dom'
import RiskBadge from './RiskBadge'

export default function PendingYouthCard({ youth, onAssign, assigning, hideViewDetails = false }) {
  const [localAssigning, setLocalAssigning] = useState(false)

  async function handleAssign() {
    setLocalAssigning(true)
    try {
      await onAssign(youth.id)
    } finally {
      setLocalAssigning(false)
    }
  }

  const busy = assigning || localAssigning

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{youth.name}</h3>
        <div className="mt-2">
          <RiskBadge level={youth.riskLevel} />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-900">Current Concern</p>
        <p className="mt-1.5 text-sm leading-snug text-slate-600">{youth.currentConcern}</p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">Case Preview</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{youth.casePreview}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleAssign}
          className="rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
        >
          {busy ? 'Assigning…' : 'Assign to Me'}
        </button>
        {!hideViewDetails && (
          <Link
            to={`/staff-dashboard/youth/${youth.id}`}
            className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            View Details
          </Link>
        )}
      </div>
    </article>
  )
}
