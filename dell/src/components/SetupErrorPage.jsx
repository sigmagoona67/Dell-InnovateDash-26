import { Link } from 'react-router-dom'
import { SETUP_ERROR } from '../lib/setupErrors'

export default function SetupErrorPage({ classified, onRetry }) {
  const isSchema = classified?.type === SETUP_ERROR.SCHEMA
  const isEnv = classified?.type === SETUP_ERROR.ENV

  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-sky-100 bg-white p-8 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.15)]">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-600">CareBridge AI Setup</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">{classified?.title || 'Setup required'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{classified?.message}</p>

        {classified?.details && (
          <p className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {classified.details}
          </p>
        )}

        {isSchema && (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Run `20260610143000_carebridge-youth-schema.sql`</li>
            <li>Run `20260610200000_carebridge-staff-schema.sql`</li>
            <li>Refresh this page</li>
          </ol>
        )}

        {isEnv && (
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">
{`VITE_INSFORGE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your_anon_key`}
          </pre>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
            >
              Retry
            </button>
          )}
          <Link
            to="/"
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to portal selection
          </Link>
        </div>
      </div>
    </div>
  )
}
