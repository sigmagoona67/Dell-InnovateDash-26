import { Link } from 'react-router-dom'
import RiskBadge from './RiskBadge'

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

  return (
    <section
      className="mb-10 rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-5 shadow-sm sm:p-6"
      aria-labelledby="urgent-alerts-heading"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Urgent</p>
          <h2 id="urgent-alerts-heading" className="mt-1 text-xl font-bold text-slate-800">
            High-Risk Youth Alerts
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {openCount
              ? `${openCount} youth need follow-up from after-hours AI support.`
              : 'All flagged cases have been acknowledged — review and resolve when follow-up is complete.'}
          </p>
        </div>
        <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {alerts.length} active
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-800">{alert.youthName}</h3>
                  <RiskBadge level={alert.riskLevel} />
                  {alert.isPendingYouth && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                      Unassigned
                    </span>
                  )}
                  {alert.status === 'acknowledged' && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                      Acknowledged
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Flagged {alert.createdAtLabel}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-700">AI summary: </span>
                {alert.aiSummary}
              </p>
              {alert.triggerMessage && (
                <p>
                  <span className="font-medium text-slate-700">Youth message: </span>
                  &ldquo;{alert.triggerMessage}&rdquo;
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {alert.status === 'open' && (
                <button
                  type="button"
                  disabled={busyId === alert.id}
                  onClick={() => onAcknowledge(alert.id)}
                  className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {busyId === alert.id ? 'Updating…' : 'Acknowledge'}
                </button>
              )}
              <button
                type="button"
                disabled={busyId === alert.id}
                onClick={() => onResolve(alert.id)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {busyId === alert.id ? 'Updating…' : 'Mark Resolved'}
              </button>
              {alert.isPendingYouth && onAssign && (
                <button
                  type="button"
                  disabled={assigningId === alert.youthId}
                  onClick={() => onAssign(alert.youthId)}
                  className="rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {assigningId === alert.youthId ? 'Assigning…' : 'Assign to Me'}
                </button>
              )}
              <Link
                to={`/staff-dashboard/youth/${alert.youthId}`}
                className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                View Case
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
