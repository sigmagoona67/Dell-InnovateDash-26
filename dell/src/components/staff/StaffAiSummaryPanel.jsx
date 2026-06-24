import { useMemo } from 'react'
import { resolveOvernightSummaryDisplay } from '../../lib/morningBrief'
import { saveChatSessionSummary } from '../../services/staffEditService'
import EditableSection from './EditableSection'

export default function StaffAiSummaryPanel({
  insights = {},
  youthName = 'Youth',
  session,
  messages = [],
  loading = false,
  moodCheckIn,
  riskLevel,
  staffProfileId = null,
  canEdit = false,
  onSessionUpdated,
}) {
  const summaryText = useMemo(
    () =>
      resolveOvernightSummaryDisplay({
        insights,
        youthName,
        session,
        messages,
      }),
    [insights, youthName, session, messages],
  )

  const displaySummary = session?.ai_summary?.trim() || summaryText
  const canSaveEdits = Boolean(canEdit && staffProfileId && session?.id)
  const staffEdited = Boolean(session?.staff_edited_fields?.ai_summary)

  return (
    <section className="space-y-4 rounded-2xl bg-sky-50/60 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Mood check-in</p>
        <p className="mt-1 text-sm text-slate-700">{moodCheckIn || 'Not recorded'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Risk level</p>
        <p className="mt-1 text-sm capitalize text-slate-700">{riskLevel || 'low'}</p>
      </div>
      <EditableSection
        title="Session summary"
        value={displaySummary || ''}
        staffEdited={staffEdited}
        disabled={!canSaveEdits || loading}
        onSave={async (text) => {
          const updated = await saveChatSessionSummary(session.id, text, staffProfileId)
          onSessionUpdated?.(updated)
        }}
      >
        <p className="text-sm leading-relaxed text-slate-700">
          {loading ? 'Loading summary…' : displaySummary || 'No summary available yet.'}
        </p>
      </EditableSection>
    </section>
  )
}
