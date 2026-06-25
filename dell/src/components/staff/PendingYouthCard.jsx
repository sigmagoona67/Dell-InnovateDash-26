import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCompatibilityScore } from '../../services/staffQuizAiService'
import { Button, RiskBadge } from '../ui'

function CompatibilityBadge({ score, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-control border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
        Calculating compatibility…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-control border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
        Compatibility unavailable right now.
      </div>
    )
  }

  if (score == null) return null

  const tone =
    score >= 75
      ? 'border-success-100 bg-success-100 text-success-600'
      : score >= 50
        ? 'border-sky-100 bg-sky-50 text-sky-600'
        : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <div className={`rounded-control border px-4 py-3 ${tone}`}>
      <p className="text-[12px] font-semibold uppercase tracking-wide opacity-80">Compatibility with you</p>
      <p className="mt-1 font-display text-[22px] font-bold">
        {score}
        <span className="text-[15px] font-semibold">/100</span>
      </p>
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
    <article className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[18px] font-semibold text-ink-800">{youth.name}</h3>
          <div className="mt-2">
            <RiskBadge level={youth.riskLevel} showBar={youth.riskLevel === 'high'} />
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

      <div className="mt-4 space-y-3 text-[13px] text-slate-600">
        {youth.email && (
          <p>
            <span className="font-bold text-slate-800">Email: </span>
            {youth.email}
          </p>
        )}

        <div>
          <p className="font-bold text-slate-800">Interests</p>
          {youth.interests?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {youth.interests.map((item) => (
                <span
                  key={item}
                  className="rounded-pill bg-teal-50 px-3 py-1 text-[12px] font-medium text-teal-600"
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
          <p className="font-bold text-slate-800">Personality snapshot</p>
          <p className="mt-1 text-slate-600">{youth.personalitySummary || 'Not provided yet'}</p>
        </div>

        {compatibility.summary && (
          <div className="rounded-control border border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-sky-600">Match insight</p>
            <p className="mt-1 text-slate-600">{compatibility.summary}</p>
          </div>
        )}

        <p>
          <span className="font-bold text-slate-800">Current challenges: </span>
          {youth.challengesLabel || 'Questionnaire not completed yet'}
        </p>
        <p>
          <span className="font-bold text-slate-800">AI summary: </span>
          {youth.aiSummary || 'No AI summary yet.'}
        </p>
      </div>

      {!staffQuizCompleted && (
        <p className="mt-4 rounded-control border border-status-violet-100 bg-status-violet-100/50 px-4 py-3 text-[13px] text-status-violet-500">
          Complete your{' '}
          <Link to="/staff-dashboard/profile-quiz" className="font-semibold underline">
            staff profile quiz
          </Link>{' '}
          to see AI compatibility scores.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button accent="sky" size="sm" loading={busy} onClick={handleAssign}>
          Assign to me
        </Button>
        {!hideViewDetails && (
          <Link
            to={`/staff-dashboard/youth/${youth.id}`}
            className="inline-flex items-center rounded-control bg-sky-50 px-3.5 py-2 text-[13px] font-medium text-sky-600 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
          >
            View details
          </Link>
        )}
      </div>
    </article>
  )
}
