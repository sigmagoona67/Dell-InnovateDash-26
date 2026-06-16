import OfflineDocumentUpload from './OfflineDocumentUpload'
import { useStaffSession } from '../../context/StaffSessionContext'

export default function OfflineSessionTab({ detail, onUpdated }) {
  const { context } = useStaffSession()

  if (detail.staffTablesReady === false) {
    return (
      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
        Offline session table is not set up yet. Open <strong>scripts/APPLY-OFFLINE-SESSIONS-COMPLETE.sql</strong>,
        copy all SQL into InsForge SQL Editor, and Run. Then refresh this page.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Offline Session Update</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload or paste counselling notes (.txt, .docx). Re-uploading on the same day replaces the existing session
          and refreshes Timeline and AI Insights.
        </p>
      </header>

      <OfflineDocumentUpload
        youthId={detail.youth.id}
        staffId={context?.staffProfile?.id}
        youthName={detail.name}
        canManage={detail.isAssigned}
        onCompleted={onUpdated}
      />
    </div>
  )
}
