import { Loader2 } from 'lucide-react'

const SIZE = {
  sm: 'px-3.5 py-2 text-[13px] font-medium gap-1.5',
  md: 'px-5 py-2.5 text-[15px] font-bold gap-2',
  lg: 'px-6 py-3.5 text-base font-bold gap-2',
}

const SPINNER_SIZE = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

// accent-scoped variant classes (full literals so Tailwind sees them)
const ACCENT = {
  teal: {
    primary: 'bg-teal-500 hover:bg-teal-600 text-white focus-visible:ring-teal-500',
    secondary: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100 hover:bg-teal-100 focus-visible:ring-teal-500',
    ghost: 'text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500',
  },
  sky: {
    primary: 'bg-sky-500 hover:bg-sky-600 text-white focus-visible:ring-sky-500',
    secondary: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100 hover:bg-sky-100 focus-visible:ring-sky-500',
    ghost: 'text-sky-600 hover:bg-sky-50 focus-visible:ring-sky-500',
  },
}

export default function Button({
  variant = 'primary',
  accent = 'sky',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  children,
  ...rest
}) {
  const accentSet = ACCENT[accent] || ACCENT.sky
  const isDisabled = disabled || loading

  const base =
    'inline-flex items-center justify-center rounded-control transition-colors duration-200 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:cursor-not-allowed select-none'

  // disabled uses bg-slate-100 text-slate-400 (NOT opacity)
  const disabledClasses = 'bg-slate-100 text-slate-400 ring-0 hover:bg-slate-100 shadow-none'

  const variantClasses = isDisabled
    ? disabledClasses
    : `${accentSet[variant] || accentSet.primary} ${variant === 'ghost' ? '' : 'shadow-card'}`

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${base} ${SIZE[size] || SIZE.md} ${variantClasses} ${className}`}
      {...rest}
    >
      {loading && (
        <Loader2 className={`${SPINNER_SIZE[size] || SPINNER_SIZE.md} motion-safe:animate-spin`} aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
