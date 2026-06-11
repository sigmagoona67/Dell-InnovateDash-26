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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{youth.name}</h3>
          <div className="mt-2">
            <RiskBadge level={youth.riskLevel} />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {youth.email && (
          <p>
            <span className="font-medium text-slate-700">Email: </span>
            {youth.email}
          </p>
        )}
        <p>
          <span className="font-medium text-slate-700">Onboarding: </span>
          {youth.onboardingCompleted ? 'Completed' : 'Not completed yet'}
        </p>
        <p>
          <span className="font-medium text-slate-700">Current challenges: </span>
          {youth.challengesLabel || 'Questionnaire not completed yet'}
        </p>
        <p>
          <span className="font-medium text-slate-700">AI summary: </span>
          {youth.aiSummary || 'No AI summary yet.'}
        </p>
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