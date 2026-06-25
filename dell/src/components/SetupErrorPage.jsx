import { Link } from 'react-router-dom'
import { SETUP_ERROR } from '../lib/setupErrors'

export default function SetupErrorPage({ classified, onRetry }) {
  const isSchema = classified?.type === SETUP_ERROR.SCHEMA
  const isEnv = classified?.type === SETUP_ERROR.ENV

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-xl rounded-panel border border-slate-200 bg-white p-8 shadow-float">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-600">CareBridge AI Setup</p>
        <h1 className="mt-2 font-display text-[22px] font-semibold leading-[1.2] text-ink-800">
          {classified?.title || 'Setup required'}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-slate-600">{classified?.message}</p>

        {classified?.details && (
          <p className="mt-4 rounded-control border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] text-ink-800">
            {classified.details}
          </p>
        )}

        {isSchema && (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[13px] text-slate-600">
            <li>Run `20260610143000_carebridge-youth-schema.sql`</li>
            <li>Run `20260610200000_carebridge-staff-schema.sql`</li>
            <li>Refresh this page</li>
          </ol>
        )}

        {isEnv && (
          <pre className="mt-4 overflow-x-auto rounded-control bg-slate-50 p-4 text-xs text-slate-600">
{`VITE_INSFORGE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your_anon_key`}
          </pre>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-control bg-sky-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-card transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              Retry
            </button>
          )}
          <Link
            to="/"
            className="rounded-control border border-slate-200 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            Back to portal selection
          </Link>
        </div>
      </div>
    </div>
  )
}
