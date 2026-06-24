import { useState } from 'react'
import { Link } from 'react-router-dom'
import RiskBadge from './RiskBadge'
import {
  formatReassignmentReasonDisplay,
  getReassignmentReasonLabel,
} from '../../lib/reassignmentReasons'
import { releaseYouthCase } from '../../services/staffService'
import { closeReassignmentRequest } from '../../services/reassignmentService'
import ReleaseCaseDialog from './ReleaseCaseDialog'

export default function AssignedYouthCard({ youth, onReleased }) {
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const reassignment = youth.pendingReassignment

  async function handleReleaseConfirm() {
    setReleasing(true)
    setErrorMessage('')
    try {
      await releaseYouthCase(youth.id)
      if (reassignment?.id) {
        await closeReassignmentRequest(reassignment.id)
      }
      setReleaseOpen(false)
      onReleased?.()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to release case.')
    } finally {
      setReleasing(false)
    }
  }

  if (reassignment) {
    return (
      <>
        <article className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">{youth.nameLine || youth.name}</h3>

          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-900">Reason:</p>
            <p className="mt-1.5 text-sm leading-snug text-slate-600">
              {getReassignmentReasonLabel(reassignment.reason)}
            </p>
            {reassignment.reason.startsWith('Other: ') && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {formatReassignmentReasonDisplay(reassignment.reason)}
              </p>
            )}
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-5 pt-1">
            <button
              type="button"
              onClick={() => setReleaseOpen(true)}
              className="inline-flex rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Release to Pool
            </button>
          </div>
        </article>

        <ReleaseCaseDialog
          open={releaseOpen}
          youthName={youth.name}
          releasing={releasing}
          onConfirm={handleReleaseConfirm}
          onCancel={() => setReleaseOpen(false)}
        />
      </>
    )
  }

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-slate-900">{youth.nameLine || youth.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RiskBadge level={youth.riskLevel} />
            {youth.crisisDetected && (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                Crisis alert
              </span>
            )}
            {youth.hasNightAiChat && (
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                Night AI chat
              </span>
            )}
            {youth.hasScheduleRequest && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                Schedule request
              </span>
            )}
            {youth.scheduleResponse === 'accepted' && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                Meeting accepted
              </span>
            )}
            {youth.scheduleResponse === 'declined' && (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                Meeting declined
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Current State</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{youth.currentStateDisplay}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Latest Interaction Insight</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{youth.latestInteractionInsight}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{youth.lastActivityLabel || 'Last Update'}</p>
          <p className="mt-1 text-sm text-slate-600">{youth.lastActivityDisplay || '—'}</p>
        </div>
      </div>

      <div className="mt-5 pt-1">
        <Link
          to={`/staff-dashboard/youth/${youth.id}`}
          className="inline-flex rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Open Profile
        </Link>
      </div>
    </article>
  )
}
