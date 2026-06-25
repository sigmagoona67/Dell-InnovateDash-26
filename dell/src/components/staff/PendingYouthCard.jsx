import { useState } from 'react'
import { Link } from 'react-router-dom'
import RiskBadge from './RiskBadge'

function MatchScoreBadge({ score }) {
  if (score == null) return null

  const tone =
    score >= 75 ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : score >= 50
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : 'bg-slate-50 text-slate-600 ring-slate-100'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>
      {score}% Match
    </span>
  )
}

export default function PendingYouthCard({ youth, onAssign, assigning, hideViewDetails = false }) {
  const [localAssigning, setLocalAssigning] = useState(false)
  const compatibility = youth.compatibility

  async function handleAssign() {
    setLocalAssigning(true)
    try {
      await onAssign(youth.id)
    } finally {
      setLocalAssigning(false)
    }
  }

  const busy = assigning || localAssigning
  const matchedFactors = compatibility?.matchedFactors || []

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{youth.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {compatibility?.score != null && <MatchScoreBadge score={compatibility.score} />}
            <RiskBadge level={youth.riskLevel} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-900">Current Concern</p>
        {youth.mentalHealthConcerns?.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {youth.mentalHealthConcerns.map((item) => (
              <li key={item} className="text-sm font-medium text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-sm leading-snug text-slate-600">{youth.currentConcern}</p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">Case Preview</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{youth.casePreview}</p>
      </div>

      {matchedFactors.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-900">Best Match</p>
          <p className="mt-1.5 text-sm leading-snug text-slate-600">
            {matchedFactors.join(' • ')}
          </p>
          {compatibility?.matchExplanation && (
            <p className="mt-1.5 text-sm leading-snug text-slate-500">{compatibility.matchExplanation}</p>
          )}
        </div>
      )}

      {compatibility?.compatibilityReason && (
        <div className="mt-4 rounded-2xl bg-sky-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Why you match</p>
          <p className="mt-1.5 text-sm leading-relaxed text-sky-900">{compatibility.compatibilityReason}</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!hideViewDetails && (
          <Link
            to={`/staff-dashboard/youth/${youth.id}`}
            className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            View Details
          </Link>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={handleAssign}
          className="rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
        >
          {busy ? 'Assigning…' : 'Assign to Me'}
        </button>
      </div>
    </article>
  )
}
