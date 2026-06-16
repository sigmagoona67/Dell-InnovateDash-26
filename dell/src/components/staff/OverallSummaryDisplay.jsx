import { useState } from 'react'
import { formatAtAGlanceDisplay } from '../../lib/overallSummaryDisplay'

const EMPTY = 'Not enough information yet'

export default function OverallSummaryDisplay({ text }) {
  const [expanded, setExpanded] = useState(false)
  const content = formatAtAGlanceDisplay(text)

  if (!content) {
    return <p className="text-sm leading-relaxed text-slate-500">{EMPTY}</p>
  }

  const isLong = content.length > 320

  return (
    <div>
      <p className={`text-[15px] leading-7 text-slate-700 ${!expanded && isLong ? 'line-clamp-5' : ''}`}>
        {content}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
