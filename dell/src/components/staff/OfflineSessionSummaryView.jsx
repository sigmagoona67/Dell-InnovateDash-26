import { resolveOfflineSessionSummary } from '../../lib/offlineSummaryParser'
import { saveOfflineSessionFollowUp, saveOfflineSessionSummary } from '../../services/staffEditService'
import EditableSection from './EditableSection'

export default function OfflineSessionSummaryView({
  session,
  youthName,
  staffProfileId = null,
  canEdit = false,
  onSessionUpdated,
}) {
  const summaryText = resolveOfflineSessionSummary(session, { youthName })
  const canSaveEdits = Boolean(canEdit && staffProfileId && session?.id)
  const meta = session?.staff_edited_fields || {}

  return (
    <section className="space-y-4 rounded-2xl bg-amber-50/60 p-4">
      <EditableSection
        title="Session summary"
        hint="Professional case impression from this interaction"
        value={summaryText || ''}
        staffEdited={Boolean(meta.ai_summary)}
        disabled={!canSaveEdits}
        onSave={async (text) => {
          const updated = await saveOfflineSessionSummary(session.id, text, staffProfileId)
          onSessionUpdated?.(updated)
        }}
      >
        <p className="text-sm leading-relaxed text-slate-700">{summaryText || 'No summary yet.'}</p>
      </EditableSection>

      <EditableSection
        title="Suggested follow-up"
        hint="Recommended staff actions after this session"
        value={session.suggested_follow_up || ''}
        staffEdited={Boolean(meta.suggested_follow_up)}
        disabled={!canSaveEdits}
        onSave={async (text) => {
          const updated = await saveOfflineSessionFollowUp(session.id, text, staffProfileId)
          onSessionUpdated?.(updated)
        }}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          {session.suggested_follow_up || 'No follow-up suggestion yet.'}
        </p>
      </EditableSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Categories</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(session.categories || []).length ? (
              session.categories.map((item) => (
                <span
                  key={item}
                  className="rounded-2xl bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-amber-100"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">Not categorised yet</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Emotion analysis</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(session.emotion_analysis || []).length ? (
              session.emotion_analysis.map((item) => (
                <span
                  key={item}
                  className="rounded-2xl bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-amber-100"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">Not analysed yet</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
