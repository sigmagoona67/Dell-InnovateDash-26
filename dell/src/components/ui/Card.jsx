const PADDING = {
  sm: 'p-4', // compact / alert — 16px
  md: 'p-6', // standard — 24px
  lg: 'p-8', // hero / auth shells — 32px
}

export default function Card({
  padding = 'md',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={`rounded-card border border-slate-200 bg-white shadow-card ${PADDING[padding] || PADDING.md} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
