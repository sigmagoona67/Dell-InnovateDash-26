import { formatAppMonthYear } from '../../lib/locale'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthCalendar({
  year,
  month,
  markedDays = [],
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  canGoPrev = true,
  canGoNext = true,
  allowAllDays = false,
  legend = '',
  compact = false,
}) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthLabel = formatAppMonthYear(year, month)
  const cellHeight = compact ? 'h-8' : 'h-10'
  const padding = compact ? 'p-4' : 'p-5'

  const cells = []
  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  const hasNav = Boolean(onPrevMonth && onNextMonth)

  return (
    <div className={`rounded-3xl border border-slate-100 bg-white shadow-sm ${padding}`}>
      <div className={`mb-3 flex items-center justify-between gap-2 ${hasNav ? '' : 'justify-center'}`}>
        {hasNav ? (
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={onPrevMonth}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            aria-label="Previous month"
          >
            ‹
          </button>
        ) : null}
        <h3 className={`text-center font-bold text-slate-800 ${compact ? 'text-sm' : 'text-lg'}`}>
          {monthLabel}
        </h3>
        {hasNav ? (
          <button
            type="button"
            disabled={!canGoNext}
            onClick={onNextMonth}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            aria-label="Next month"
          >
            ›
          </button>
        ) : null}
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((day) => (
          <div key={day}>{compact ? day.slice(0, 1) : day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />
          }

          const hasMarker = markedDays.includes(day)
          const isSelectable = allowAllDays || hasMarker
          const isSelected = selectedDay === day

          return (
            <button
              key={day}
              type="button"
              disabled={!isSelectable}
              onClick={() => isSelectable && onSelectDay(day)}
              className={`relative flex ${cellHeight} items-center justify-center rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                isSelectable ? 'cursor-pointer hover:bg-teal-50' : 'cursor-default text-slate-300'
              } ${isSelected ? 'bg-teal-100 text-teal-800 ring-1 ring-teal-200' : 'text-slate-700'}`}
            >
              {day}
              {hasMarker && (
                <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      {legend ? <p className="mt-3 text-center text-xs text-slate-500">{legend}</p> : null}
    </div>
  )
}
