import Button from './ui/Button'

/**
 * Portal entry card. Restyled to the design system.
 * Props: icon (lucide component, preferred), emoji (legacy fallback, decorative),
 *        title, description, buttonLabel, accent ('sky'|'teal'), onEnter
 */
const ACCENT = {
  sky: { iconBg: 'bg-sky-50 text-sky-600', glow: 'from-sky-100/60', ring: 'group-hover:ring-sky-100' },
  teal: { iconBg: 'bg-teal-50 text-teal-600', glow: 'from-teal-100/60', ring: 'group-hover:ring-teal-100' },
}

export default function PortalCard({
  icon: Icon,
  emoji,
  title,
  description,
  buttonLabel,
  accent = 'sky',
  onEnter,
}) {
  const style = ACCENT[accent] || ACCENT.sky

  return (
    <article
      className={`
        group relative flex flex-col rounded-card border border-slate-200
        bg-white p-8 shadow-card transition-all duration-300 ease-out
        motion-safe:hover:-translate-y-1.5 hover:shadow-card-hover
        hover:ring-2 ${style.ring}
        focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-200
      `}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-full bg-gradient-to-b ${style.glow} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />

      <div
        className={`relative mb-6 flex h-16 w-16 items-center justify-center rounded-card ${style.iconBg} motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105`}
        aria-hidden="true"
      >
        {Icon ? <Icon className="h-8 w-8" strokeWidth={1.75} /> : <span className="text-3xl">{emoji}</span>}
      </div>

      <h2 className="relative mb-3 font-display text-[22px] font-semibold leading-[1.2] tracking-tight text-ink-800">
        {title}
      </h2>

      <p className="relative mb-8 flex-1 text-[15px] leading-[1.55] text-slate-600">
        {description}
      </p>

      <Button accent={accent} variant="primary" size="lg" onClick={onEnter} className="relative w-full">
        {buttonLabel}
      </Button>
    </article>
  )
}
