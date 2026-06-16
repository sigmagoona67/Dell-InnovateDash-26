import { useState } from 'react'
import { OFFLINE_DOCUMENT_ACCEPT } from '../../lib/documentParser'
import { deleteDraftSession } from '../../services/offlineSessionService'
import { approveOfflineSessionAndSyncInsights, processOfflineDocument } from '../../services/offlineUploadService'
import { getInsights } from '../../services/staffInsightsService'
import OfflineSessionSummaryView from './OfflineSessionSummaryView'
import RiskBadge from './RiskBadge'

export default function OfflineDocumentUpload({
  youthId,
  staffId,
  youthName,
  canManage,
  onCompleted,
  compact = false,
}) {
  const [mode, setMode] = useState('upload')
  const [file, setFile] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  if (!canManage) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Assign this youth to yourself before uploading offline session documents.
      </p>
    )
  }

  async function handleGenerate() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const existingInsights = await getInsights(youthId)
      const result = await processOfflineDocument({
        file: mode === 'upload' ? file : null,
        pastedText: mode === 'paste' ? transcript : null,
        youthId,
        staffId,
        youthName,
        previousInsights: existingInsights || {},
      })

      setDraft(result.session)
      setSuccessMessage(
        result.fallbackNotice
          ? `${result.fallbackNotice} Review the summary, then approve to update Dynamic Insights.`
          : 'Document processed. Review the AI summary, then approve to update Dynamic Insights.',
      )
    } catch (error) {
      const msg = String(error?.message || '')
      if (msg.toLowerCase().includes('offline_counselling_sessions')) {
        setErrorMessage(
          'Offline session table is not set up yet. Run scripts/APPLY-OFFLINE-SESSIONS-COMPLETE.sql in InsForge SQL Editor first.',
        )
      } else if (msg.toLowerCase().includes('empty') || msg.toLowerCase().includes('looks empty')) {
        setErrorMessage(
          'Your Word file looks empty. Open fixtures/demo-offline-session-transcript.txt, copy all text into Word, save as .docx, or upload the .txt file directly.',
        )
      } else {
        setErrorMessage(msg || 'Unable to process document.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!draft) return
    setLoading(true)
    setErrorMessage('')

    try {
      const existingInsights = await getInsights(youthId)
      await approveOfflineSessionAndSyncInsights({
        session: draft,
        youthId,
        staffProfileId: staffId,
        existingInsights: existingInsights || {},
        youthName,
      })

      setSuccessMessage('Offline session saved. Timeline and Current Care Insights have been updated.')
      setDraft(null)
      setFile(null)
      setTranscript('')
      onCompleted?.()
    } catch (error) {
      const msg = String(error?.message || '')
      if (/dynamic_profile/i.test(msg) && /schema cache|column/i.test(msg)) {
        setErrorMessage(
          'Insights profile column is missing in the database. Run migrations/20260610500000_ai-dynamic-profile.sql in the InsForge SQL Editor, then approve again.',
        )
      } else {
        setErrorMessage(msg || 'Unable to approve session.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (draft?.id) {
      try {
        await deleteDraftSession(draft.id)
      } catch {
        // ignore
      }
    }
    setDraft(null)
    setSuccessMessage('')
    setErrorMessage('')
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm'}`}>
      {errorMessage && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
      )}
      {successMessage && (
        <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{successMessage}</p>
      )}

      {!draft && (
        <>
          <div className="inline-flex rounded-2xl bg-white p-1 ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === 'upload' ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Upload Document
            </button>
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === 'paste' ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Paste Transcript
            </button>
          </div>

          {mode === 'upload' ? (
            <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <span className="text-sm font-medium text-slate-700">Choose a document</span>
              <p className="mt-1 text-xs text-slate-500">Supported: .txt, .docx (PDF and .doc — paste text instead)</p>
              <input
                type="file"
                accept={OFFLINE_DOCUMENT_ACCEPT}
                className="mx-auto mt-3 block text-sm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="mt-2 text-sm text-slate-600">{file.name}</p>}
            </label>
          ) : (
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              placeholder="Paste offline session notes or agreement transcript…"
            />
          )}

          <button
            type="button"
            disabled={loading || (mode === 'upload' ? !file : !transcript.trim())}
            onClick={handleGenerate}
            className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {loading ? 'Processing…' : 'Generate AI Summary'}
          </button>
        </>
      )}

      {draft && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-bold text-slate-900">Review before saving</h4>
            <RiskBadge level={draft.risk_level || 'low'} />
          </div>

          <OfflineSessionSummaryView session={draft} youthName={youthName} />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleApprove}
              className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              Approve & Update Insights
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
