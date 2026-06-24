import { CRISIS_SUPPORT_PANEL } from '../../lib/crisisSupportPanel'

export default function CrisisSupportPanel() {
  return (
    <div className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-700">
      <p>{CRISIS_SUPPORT_PANEL.intro}</p>
      <p className="mt-3 font-semibold text-slate-800">{CRISIS_SUPPORT_PANEL.title}</p>
      <ul className="mt-2 space-y-1">
        {CRISIS_SUPPORT_PANEL.resources.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <p className="mt-3 text-slate-600">{CRISIS_SUPPORT_PANEL.closing}</p>
    </div>
  )
}
