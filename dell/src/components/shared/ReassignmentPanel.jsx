import { useCallback, useEffect, useState } from 'react'
import {
  buildYouthReassignmentReason,
  formatReassignmentReasonDisplay,
  getReassignmentReasonLabel,
  OTHER_REASSIGNMENT_REASON,
  YOUTH_REASSIGNMENT_REASONS,
} from '../../lib/reassignmentReasons'
import {
  createReassignmentRequest,
  getLatestReassignmentRequest,
  getYouthVisibleReassignmentRequest,
  parseReassignmentError,
} from '../../services/reassignmentService'
import ReassignmentConfirmDialog from '../youth/ReassignmentConfirmDialog'

function ReasonOption({ label, selected, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(label)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-60 ${
        selected
          ? 'border-teal-200 bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-100'
          : 'border-slate-200 bg-white text-slate-700 hover:border-sky-100 hover:bg-sky-50/60'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-teal-500' : 'border-slate-300'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-teal-500" />}
      </span>
      {label}
    </button>
  )
}

function YouthReassignmentNotice({ youthName, reason }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)]">
      <h2 className="text-lg font-bold text-slate-900">{youthName}</h2>
      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-900">Reason:</p>
        <p className="mt-1.5 text-sm leading-snug text-slate-600">{getReassignmentReasonLabel(reason)}</p>
        {reason?.startsWith('Other: ') && (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {formatReassignmentReasonDisplay(reason)}
          </p>
        )}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-slate-600">
        Your youth worker has been notified.
      </p>
    </div>
  )
}

export default function ReassignmentPanel({
  role = 'youth',
  youthId,
  youthRow = null,
  youthName = 'Youth',
  requesterProfileId,
  assignedStaffId = null,
  canSubmit = true,
  assignmentEpoch = 0,
}) {
  const [selectedReason, setSelectedReason] = useState('')
  const [otherDetails, setOtherDetails] = useState('')
  const [pendingRequest, setPendingRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadPending = useCallback(async () => {
    if (!youthId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErrorMessage('')
    try {
      if (role === 'youth' && youthRow) {
        if (!youthRow.assigned_staff_id) {
          setPendingRequest(null)
          return
        }
        const request = await getYouthVisibleReassignmentRequest(youthRow, { requestedBy: role })
        setPendingRequest(request)
      } else {
        const { request } = await getLatestReassignmentRequest(youthId, { requestedBy: role })
        setPendingRequest(request)
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load reassignment status.')
    } finally {
      setLoading(false)
    }
  }, [youthId, role, youthRow, assignmentEpoch])

  useEffect(() => {
    setSelectedReason('')
    setOtherDetails('')
    setConfirmOpen(false)
    loadPending()
  }, [loadPending, assignmentEpoch])

  useEffect(() => {
    if (!canSubmit) {
      setPendingRequest(null)
    }
  }, [canSubmit, assignmentEpoch])

  const reasonReady =
    selectedReason &&
    (selectedReason !== OTHER_REASSIGNMENT_REASON || otherDetails.trim().length > 0)

  const builtReason = reasonReady
    ? buildYouthReassignmentReason(selectedReason, otherDetails)
    : ''

  function handleContinueClick() {
    if (!canSubmit || !reasonReady) return
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!canSubmit || !youthId || !requesterProfileId || !builtReason) return

    setSubmitting(true)
    setErrorMessage('')
    try {
      const created = await createReassignmentRequest({
        youthId,
        requestedBy: role,
        requesterProfileId,
        assignedStaffId,
        reason: builtReason,
      })
      setPendingRequest(created)
      setSelectedReason('')
      setOtherDetails('')
      setConfirmOpen(false)
    } catch (error) {
      setErrorMessage(parseReassignmentError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Request Reassignment</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Choose a reason below. Your youth worker will be notified so they can release your case
          for a new match.
        </p>
      </header>

      {errorMessage && (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : pendingRequest && canSubmit ? (
        <YouthReassignmentNotice youthName={youthName} reason={pendingRequest.reason} />
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)]">
          {!canSubmit && (
            <p className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              This is available once a youth worker is assigned.
            </p>
          )}

          <fieldset disabled={!canSubmit || submitting} className="space-y-2">
            <legend className="mb-3 text-sm font-semibold text-slate-800">
              Why would you like a different worker?
            </legend>
            {YOUTH_REASSIGNMENT_REASONS.map((reason) => (
              <ReasonOption
                key={reason}
                label={reason}
                selected={selectedReason === reason}
                disabled={!canSubmit || submitting}
                onSelect={setSelectedReason}
              />
            ))}
          </fieldset>

          {selectedReason === OTHER_REASSIGNMENT_REASON && (
            <div className="mt-4">
              <label htmlFor="reassignment-other-details" className="mb-1 block text-sm font-semibold text-slate-800">
                Tell us a little more
              </label>
              <textarea
                id="reassignment-other-details"
                rows={4}
                value={otherDetails}
                onChange={(event) => setOtherDetails(event.target.value)}
                placeholder="Share what you are looking for in support…"
                disabled={!canSubmit || submitting}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
              />
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit || submitting || !reasonReady}
            onClick={handleContinueClick}
            className="mt-6 rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      )}

      <ReassignmentConfirmDialog
        open={confirmOpen}
        reason={builtReason}
        confirming={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
