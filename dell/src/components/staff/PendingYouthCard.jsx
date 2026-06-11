import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCompatibilityScore } from '../../services/staffQuizAiService'
import RiskBadge from './RiskBadge'

function CompatibilityBadge({ score, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Calculating compatibility…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Compatibility unavailable: {error}
      </div>
    )
  }

  if (score == null) return null

  const tone =
    score >= 75 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
    score >= 50 ? 'border-sky-200 bg-sky-50 text-sky-800' :
    'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Compatibility with you</p>
      <p className="mt-1 text-2xl font-bold">{score}<span className="text-base font-semibold">/100</span></p>
    </div>
  )
}

export default function PendingYouthCard({
  youth,
  onAssign,
  assigning,
  hideViewDetails = false,
  staffQuizCompleted = false,
}) {
  const [localAssigning, setLocalAssigning] = useState(false)
  const [compatibility, setCompatibility] = useState({ score: null, summary: '', loading: false, error: '' })

  useEffect(() => {
    if (!staffQuizCompleted || !youth.questionnaire) return

    let cancelled = false

    async function loadCompatibility() {
      setCompatibility((prev) => ({ ...prev, loading: true, error: '' }))
      try {
        const result = await getCompatibilityScore({
          youthQuestionnaire: youth.questionnaire,
          youthName: youth.name,
        })
        if (!cancelled) {
          setCompatibility({
            score: result.score,
            summary: result.summary || '',
            loading: false,
            error: '',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setCompatibility({
            score: null,
            summary: '',
            loading: false,
            error: error.message || 'Could not calculate score',
          })
        }
      }
    }

    loadCompatibility()
    return () => {
      cancelled = true
    }
  }, [staffQuizCompleted, youth.id, youth.name, youth.questionnaire])

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
        {staffQuizCompleted && (
          <CompatibilityBadge
            score={compatibility.score}
            loading={compatibility.loading}
            error={compatibility.error}
          />
        )}
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600">
        {youth.email && (
          <p>
            <span className="font-medium text-slate-700">Email: </span>
            {youth.email}
          </p>
        )}

        <div>
          <p className="font-medium text-slate-700">Interests</p>
          {youth.interests?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {youth.interests.map((item) => (
                <span
                  key={item}
                  className="rounded-2xl bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-slate-500">Not provided yet</p>
          )}
        </div>

        <div>
          <p className="font-medium text-slate-700">Personality snapshot</p>
          <p className="mt-1 text-slate-600">{youth.personalitySummary || 'Not provided yet'}</p>
        </div>

        {compatibility.summary && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Match insight</p>
            <p className="mt-1 text-slate-700">{compatibility.summary}</p>
          </div>
        )}

        <p>
          <span className="font-medium text-slate-700">Current challenges: </span>
          {youth.challengesLabel || 'Questionnaire not completed yet'}
        </p>
        <p>
          <span className="font-medium text-slate-700">AI summary: </span>
          {youth.aiSummary || 'No AI summary yet.'}
        </p>
      </div>

      {!staffQuizCompleted && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complete your{' '}
          <Link to="/staff-dashboard/profile-quiz" className="font-semibold underline">
            staff profile quiz
          </Link>{' '}
          to see AI compatibility scores.
        </p>
      )}

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
