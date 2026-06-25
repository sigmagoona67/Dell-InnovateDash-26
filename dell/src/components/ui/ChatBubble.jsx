/**
 * ONE bubble used by both live chat and history.
 * ai    = bg-teal-50 + teal accent, tail bottom-left (rounded-bl-md)
 * youth = bg-white ring-1 ring-slate-200, tail bottom-right (rounded-br-md)
 */
const SIDE = {
  ai: 'self-start bg-teal-50 text-slate-800 ring-1 ring-teal-100 rounded-bl-md',
  youth: 'self-end bg-white text-slate-800 ring-1 ring-slate-200 rounded-br-md',
}

export default function ChatBubble({ side = 'ai', className = '', children }) {
  const tone = SIDE[side] || SIDE.ai
  return (
    <div
      className={`max-w-[85%] rounded-card px-4 py-3 text-[15px] leading-[1.55] shadow-card ${tone} ${className}`}
    >
      {children}
    </div>
  )
}
