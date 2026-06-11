export default function PortalCard({
  emoji,
  title,
  description,
  buttonLabel,
  accent = 'sky',
  onEnter,
}) {
  const accents = {
    sky: {
      ring: 'hover:ring-sky-200',
      iconBg: 'bg-sky-50',
      button: 'bg-sky-500 hover:bg-sky-600 focus-visible:ring-sky-400',
      glow: 'from-sky-100/60',
    },
    teal: {
      ring: 'hover:ring-teal-200',
      iconBg: 'bg-teal-50',
      button: 'bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-400',
      glow: 'from-teal-100/60',
    },
  }

  const style = accents[accent]

  return (
    <article
      className={`
        group relative flex flex-col rounded-3xl border border-slate-100
        bg-white p-8 sm:p-10 shadow-[0_4px_24px_-4px_rgba(45,90,110,0.08)]
        transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:shadow-[0_16px_48px_-12px_rgba(45,90,110,0.14)]
        hover:ring-2 ${style.ring}
        focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-300
      `}
    >
      <div
        aria-hidden="true"
        className={`
          pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-full
          bg-gradient-to-b ${style.glow} to-transparent opacity-0
          transition-opacity duration-300 group-hover:opacity-100
        `}
      />

      <div
        className={`
          relative mb-6 flex h-16 w-16 items-center justify-center
          rounded-2xl text-3xl ${style.iconBg}
          transition-transform duration-300 group-hover:scale-105
        `}
        aria-hidden="true"
      >
        {emoji}
      </div>

      <h2 className="relative mb-3 text-2xl font-semibold tracking-tight text-slate-800">
        {title}
      </h2>

      <p className="relative mb-8 flex-1 text-base leading-relaxed text-slate-600">
        {description}
      </p>

      <button
        type="button"
        onClick={onEnter}
        className={`
          relative w-full rounded-2xl px-6 py-4 text-base font-semibold
          text-white shadow-sm transition-all duration-200
          hover:shadow-md active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${style.button}
        `}
      >
        {buttonLabel}
      </button>
    </article>
  )
}
