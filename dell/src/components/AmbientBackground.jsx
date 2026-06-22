const VARIANTS = {
  sky: {
    left: 'bg-sky-50',
    right: 'bg-teal-50',
    leftPos: '-left-24 top-0',
    rightPos: '-right-24 bottom-0',
  },
  teal: {
    left: 'bg-teal-50',
    right: 'bg-sky-50',
    leftPos: '-left-24 top-0',
    rightPos: '-right-24 bottom-0',
  },
  centered: {
    left: 'bg-sky-50',
    right: 'bg-teal-50',
    leftPos: '-left-24 top-1/4',
    rightPos: '-right-20 bottom-1/4',
  },
  landing: {
    left: 'bg-sky-50',
    right: 'bg-teal-50',
    leftPos: '-left-32 top-1/4',
    rightPos: '-right-24 bottom-1/4',
    gradient: true,
  },
}

export default function AmbientBackground({ variant = 'sky' }) {
  const style = VARIANTS[variant] || VARIANTS.sky

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className={`absolute ${style.leftPos} h-96 w-96 rounded-full ${style.left} opacity-60 blur-2xl`} />
      <div className={`absolute ${style.rightPos} h-80 w-80 rounded-full ${style.right} opacity-60 blur-2xl`} />
      {style.gradient && (
        <div className="absolute left-1/2 top-0 h-px w-full max-w-3xl -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-100 to-transparent" />
      )}
    </div>
  )
}
