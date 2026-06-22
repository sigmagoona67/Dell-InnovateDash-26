import { memo } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MonthCalendar({
  year,
  month,
  markedDays = [],
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  canGoPrev = false,
  canGoNext = false,
  allowAllDays = false,
  legend,
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

  const hasNavigation = Boolean(onPrevMonth || onNextMonth)

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex items-center ${hasNavigation ? 'justify-between gap-2' : 'justify-center'}`}>
        {hasNavigation && (
          <button
            type="button"
            onClick={onPrevMonth}
            disabled={!canGoPrev}
            className="rounded-xl px-2 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous month"
          >
            ←
          </button>
        )}
        <h3 className="text-center text-lg font-bold text-slate-800">{monthLabel}</h3>
        {hasNavigation && (
          <button
            type="button"
            onClick={onNextMonth}
            disabled={!canGoNext}
            className="rounded-xl px-2 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next month"
          >
            →
          </button>
        )}
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />
          }

          const isMarked = markedDays.includes(day)
          const isSelected = selectedDay === day
          const isClickable = allowAllDays || isMarked

          return (
            <button
              key={day}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onSelectDay(day)}
              className={`
                relative flex h-10 items-center justify-center rounded-xl text-sm font-medium transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                ${isClickable ? 'cursor-pointer hover:bg-sky-50' : 'cursor-default text-slate-300'}
                ${isSelected ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200' : 'text-slate-700'}
              `}
            >
              {day}
              {isMarked && (
                <span
                  className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-sky-500"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {legend && <div className="mt-4 text-xs text-slate-500">{legend}</div>}
    </div>
  )
}

export default memo(MonthCalendar)
