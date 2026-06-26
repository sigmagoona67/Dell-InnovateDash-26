import { useState } from 'react'
import { useStaffSession } from '../../context/StaffSessionContext'
import { approveSession, createDraftSession, deleteDraftSession, updateDraftSession } from '../../services/offlineSessionService'
import { upsertInsights } from '../../services/staffInsightsService'
import { buildMockOfflineSummary, generateOfflineSummary } from '../../services/staffAiService'
import { FileUp } from 'lucide-react'
import { Button, RiskBadge } from '../ui'
import { extractTextFromFile, OFFLINE_DOCUMENT_ACCEPT } from '../../lib/documentParser'

export default function OfflineSessionTab({ detail, onUpdated }) {
  const { context } = useStaffSession()
  const [mode, setMode] = useState('upload')
  const [transcript, setTranscript] = useState('')
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [fileName, setFileName] = useState('')

  const canManage = detail.isAssigned

  async function handleGenerate() {
    if (!transcript.trim()) {
      setErrorMessage('Please paste a transcript or upload notes before generating a summary.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      let summary
      try {
        summary = await generateOfflineSummary({
          transcript,
          previousInsights: detail.insights,
          youthName: detail.name,
        })
      } catch {
        summary = buildMockOfflineSummary(transcript, detail.insights)
      }

      if (detail.usingMock || !canManage) {
        setDraft({ ...summary, transcript, status: 'draft', mock: true })
        setEditing(true)
        setSuccessMessage('AI summary generated. Review and approve when ready.')
        return
      }

      const session = await createDraftSession({
        youthId: detail.youth.id,
        staffId: context.staffProfile.id,
        transcript,
      })

      const updated = await updateDraftSession(session.id, {
        ...summary,
        emotion_analysis: summary.emotion_analysis,
        categories: summary.categories,
        main_risk: summary.main_risk,
        best_communication_approach: summary.best_communication_approach,
      })

      setDraft(updated)
      setEditing(true)
      setSuccessMessage('AI summary generated. Review and approve when ready.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to generate summary.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setExtracting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const text = await extractTextFromFile(file)
      setTranscript(text)
      setFileName(file.name)
      setMode('transcript')
      setSuccessMessage(`Loaded “${file.name}” — review the text below, then generate the summary.`)
    } catch (error) {
      setErrorMessage(error.message || 'Could not read that file.')
    } finally {
      setExtracting(false)
      event.target.value = ''
    }
  }

  async function handleApprove() {
    if (!draft) return
    setLoading(true)
    setErrorMessage('')

    try {
      if (!detail.usingMock && draft.id && canManage) {
        await approveSession(draft.id)
        await upsertInsights(
          detail.youth.id,
          {
            current_state: draft.current_state || [],
            risk_level: draft.risk_level || 'medium',
            main_risk: draft.main_risk || [],
            best_communication_approach: draft.best_communication_approach || [],
            latest_change: draft.latest_change || draft.ai_summary,
          },
          context.staffProfile.id,
        )
      }

      setSuccessMessage('Session approved. Case timeline and AI insights will update.')
      setTranscript('')
      setDraft(null)
      setEditing(false)
      onUpdated?.()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to approve session.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (draft?.id && !detail.usingMock && canManage) {
      try {
        await deleteDraftSession(draft.id)
      } catch {
        // ignore
      }
    }
    setDraft(null)
    setEditing(false)
    setTranscript('')
    setSuccessMessage('')
  }

  if (!canManage) {
    return (
      <div className="rounded-card border border-status-violet-100 bg-status-violet-100/50 p-6 text-[13px] text-status-violet-500">
        Assign this youth to yourself before uploading offline counselling sessions.
      </div>
    )
  }

  if (detail.staffTablesReady === false) {
    return (
      <div className="rounded-card border border-slate-200 bg-slate-50 p-6 text-[13px] text-slate-600">
        Offline session updates are not available right now. Please check back later or contact your administrator.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Offline Session Update</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload offline counselling records and let AI combine them with existing case understanding
        </p>
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-card border border-danger-100 bg-danger-100/50 px-4 py-3 text-[13px] text-danger-700"
        >
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="rounded-card border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] text-sky-600"
        >
          {successMessage}
        </p>
      )}

      {!draft && (
        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 inline-flex rounded-control bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`rounded-control px-4 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${mode === 'upload' ? 'bg-white text-sky-600 shadow-card' : 'text-slate-500'}`}
            >
              Upload document
            </button>
            <button
              type="button"
              onClick={() => setMode('transcript')}
              className={`rounded-control px-4 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${mode === 'transcript' ? 'bg-white text-sky-600 shadow-card' : 'text-slate-500'}`}
            >
              Paste transcript
            </button>
          </div>

          {mode === 'upload' ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-sky-200 bg-sky-50/50 p-8 text-center transition hover:bg-sky-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500">
              <FileUp className="h-7 w-7 text-sky-500" aria-hidden="true" />
              <span className="text-[15px] font-semibold text-ink-800">
                {extracting ? 'Reading document…' : 'Upload a counselling document'}
              </span>
              <span className="max-w-sm text-[13px] text-slate-500">
                Drop a <span className="font-medium">.docx</span> or <span className="font-medium">.txt</span> file, or click to browse — we’ll pull out the text for the AI to summarise.
              </span>
              <input
                type="file"
                accept={OFFLINE_DOCUMENT_ACCEPT}
                onChange={handleFile}
                disabled={extracting}
                className="sr-only"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-slate-600">
                Session transcript{fileName ? ` · from ${fileName}` : ''}
              </span>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                className="w-full rounded-control border border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
                placeholder="Paste offline counselling notes or transcript here…"
              />
            </label>
          )}

          <div className="mt-4">
            <Button accent="sky" loading={loading} onClick={handleGenerate}>
              Generate AI summary
            </Button>
          </div>
        </section>
      )}

      {draft && (
        <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-slate-800">AI Generated Summary</h3>
            <RiskBadge level={draft.risk_level || 'medium'} />
          </div>

          {editing ? (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Summary</span>
                <textarea
                  value={draft.ai_summary || ''}
                  onChange={(e) => setDraft({ ...draft, ai_summary: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Latest change</span>
                <textarea
                  value={draft.latest_change || ''}
                  onChange={(e) => setDraft({ ...draft, latest_change: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Suggested follow-up</span>
                <textarea
                  value={draft.suggested_follow_up || ''}
                  onChange={(e) => setDraft({ ...draft, suggested_follow_up: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700">{draft.ai_summary}</p>
              <p className="text-sm text-slate-500">{draft.latest_change}</p>
              <p className="text-sm text-slate-500">{draft.suggested_follow_up}</p>
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button accent="sky" size="sm" loading={loading} onClick={handleApprove}>
              Approve
            </Button>
            <Button
              variant="secondary"
              accent="sky"
              size="sm"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? 'Done editing' : 'Edit'}
            </Button>
            <Button variant="ghost" accent="sky" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
