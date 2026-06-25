/**
 * Three animated dots, ai-styled. Shown while the AI reply is pending.
 * Wrapped in aria-live='polite'; dots freeze under reduced motion.
 */
export default function TypingBubble({ className = '' }) {
  return (
    <div
      aria-live="polite"
      aria-label="Assistant is typing"
      className={`max-w-[85%] self-start rounded-card rounded-bl-md bg-teal-50 px-4 py-3 shadow-card ring-1 ring-teal-100 ${className}`}
    >
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-teal-500 motion-safe:animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-teal-500 motion-safe:animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-teal-500 motion-safe:animate-bounce motion-reduce:animate-none" />
      </span>
    </div>
  )
}
