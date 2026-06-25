/**
 * Loading placeholder. slate-100 base, shimmer gated motion-safe.
 * Replaces one-line 'Loading…' text.
 * variant: 'line' (default) | 'block' | 'circle'
 */
const VARIANT = {
  line: 'h-4 w-full rounded-control',
  block: 'h-24 w-full rounded-card',
  circle: 'h-10 w-10 rounded-pill',
}

export default function Skeleton({ variant = 'line', className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-slate-100 motion-safe:animate-pulse ${VARIANT[variant] || ''} ${className}`}
    />
  )
}
