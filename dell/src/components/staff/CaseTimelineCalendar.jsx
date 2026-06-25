const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Dot({ tone }) {
  return <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-pill ${tone}`} />
}

function DayMarkers({ hasAi, hasOffline }) {
  if (hasAi && hasOffline) {
    return (
      <span className="flex items-center gap-0.5">
        <Dot tone="bg-sky-500" />
        <Dot tone="bg-teal-500" />
      </span>
    )
  }
  if (hasAi) return <Dot tone="bg-sky-500" />
  if (hasOffline) return <Dot tone="bg-teal-500" />
  return null
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
  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  const cells = []
  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-center font-display text-[18px] font-semibold text-ink-800">{monthLabel}</h3>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[12px] font-medium text-slate-500">
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
              className={`relative flex h-10 flex-col items-center justify-center rounded-control text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${
                clickable ? 'cursor-pointer text-slate-600 hover:bg-sky-50' : 'cursor-default text-slate-400'
              } ${isSelected ? 'bg-sky-50 text-sky-600' : ''}`}
            >
              {day}
              <span className="absolute bottom-1 flex items-center justify-center">
                <DayMarkers hasAi={hasAi} hasOffline={hasOffline} />
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-[12px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="bg-sky-500" /> AI Chat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="bg-teal-500" /> Offline Session
        </span>
      </div>
    </div>
  )
}
