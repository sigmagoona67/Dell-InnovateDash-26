import { formatAppMonthYear } from '../../lib/locale'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MARKER_EMOJI = { ai: '🔵', offline: '🟡' }

function DayMarkers({ hasAi, hasOffline }) {
  if (!hasAi && !hasOffline) return null
  return (
    <span className="-mt-0.5 text-[10px] leading-none tracking-tighter" aria-hidden="true">
      {hasAi ? MARKER_EMOJI.ai : ''}
      {hasOffline ? MARKER_EMOJI.offline : ''}
    </span>
  )
}

export default function CaseTimelineCalendar({
  year,
  month,
  aiDays,
  offlineDays,
  selectedDay,
  onSelectDay,
}) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthLabel = formatAppMonthYear(year, month)

  const cells = []
  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-center text-lg font-bold text-slate-800">{monthLabel}</h3>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} />

          const hasAi = aiDays.includes(day)
          const hasOffline = offlineDays.includes(day)
          const clickable = hasAi || hasOffline
          const isSelected = selectedDay === day

          return (
            <button
              key={day}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelectDay(day)}
              className={`flex h-10 flex-col items-center justify-center gap-0 rounded-xl text-sm font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                clickable ? 'cursor-pointer hover:bg-sky-50 text-slate-700' : 'cursor-default text-slate-300'
              } ${isSelected ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200' : ''}`}
            >
              <span>{day}</span>
              <DayMarkers hasAi={hasAi} hasOffline={hasOffline} />
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>🔵 AI Chat</span>
        <span>🟡 Offline Session</span>
        <span>🔵🟡 Both</span>
      </div>
    </div>
  )
}
