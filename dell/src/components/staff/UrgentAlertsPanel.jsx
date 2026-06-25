import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button, RiskBadge, StatusPill } from '../ui'

export default function UrgentAlertsPanel({
  alerts,
  onAcknowledge,
  onResolve,
  busyId,
  onAssign,
  assigningId,
}) {
  if (!alerts?.length) return null

  const openCount = alerts.filter((alert) => alert.status === 'open').length
  const urgent = openCount > 0

  // Open items first, ranked ahead of acknowledged ones.
  const ranked = [...alerts].sort((a, b) => {
    if (a.status === b.status) return 0
    return a.status === 'open' ? -1 : 1
  })

  return (
    <section
      aria-labelledby="urgent-alerts-heading"
      aria-live="polite"
      className={`mb-6 rounded-card border p-4 sm:p-6 ${
        urgent
          ? 'border-danger-100 bg-danger-100/40 shadow-float'
          : 'border-slate-200 bg-slate-50 shadow-card'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide ${
              urgent ? 'text-danger-700' : 'text-slate-500'
            }`}
          >
            {urgent ? (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            {urgent ? 'Urgent' : 'Follow-up pending'}
          </p>
          <h2
            id="urgent-alerts-heading"
            className="mt-1 font-display text-[22px] font-semibold text-ink-800"
          >
            High-risk youth alerts
          </h2>
          <p className="mt-1 text-[13px] text-slate-600">
            {urgent
              ? `${openCount} youth need follow-up from after-hours AI support.`
              : 'All flagged cases acknowledged — review and resolve when follow-up is complete.'}
          </p>
        </div>
        <span
          className={`rounded-pill px-3 py-1 text-[12px] font-bold uppercase tracking-wide ${
            urgent ? 'bg-danger-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {alerts.length} active
        </span>
      </div>

      <div className="space-y-3">
        {ranked.map((alert) => {
          const isOpen = alert.status === 'open'
          return (
            <article
              key={alert.id}
              className={`relative overflow-hidden rounded-card border bg-white p-4 ${
                isOpen ? 'border-danger-100 shadow-card' : 'border-slate-200 opacity-75'
              }`}
            >
              {isOpen && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-1 bg-danger-600"
                />
              )}
              <div className={isOpen ? 'pl-2' : ''}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[18px] font-semibold text-ink-800">
                        {alert.youthName}
                      </h3>
                      <RiskBadge level={alert.riskLevel} showBar={alert.riskLevel === 'high'} />
                      {alert.isPendingYouth && <StatusPill status="unassigned">Unassigned</StatusPill>}
                      {alert.status === 'acknowledged' && (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-sky-50 px-2.5 py-1 text-[12px] font-semibold text-sky-600">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500">Flagged {alert.createdAtLabel}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-[13px] text-slate-600">
                  <p>
                    <span className="font-bold text-slate-800">AI summary: </span>
                    {alert.aiSummary}
                  </p>
                  {alert.triggerMessage && (
                    <p>
                      <span className="font-bold text-slate-800">Youth message: </span>
                      &ldquo;{alert.triggerMessage}&rdquo;
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {isOpen && (
                    <Button
                      accent="sky"
                      size="sm"
                      loading={busyId === alert.id}
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    accent="sky"
                    size="sm"
                    loading={busyId === alert.id}
                    onClick={() => onResolve(alert.id)}
                  >
                    Mark resolved
                  </Button>
                  {alert.isPendingYouth && onAssign && (
                    <Button
                      accent="sky"
                      size="sm"
                      loading={assigningId === alert.youthId}
                      onClick={() => onAssign(alert.youthId)}
                    >
                      Assign to me
                    </Button>
                  )}
                  <Link
                    to={`/staff-dashboard/youth/${alert.youthId}`}
                    className="inline-flex items-center rounded-control bg-sky-50 px-3.5 py-2 text-[13px] font-medium text-sky-600 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
                  >
                    View case
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
