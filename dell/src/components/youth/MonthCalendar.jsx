import { memo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ACCENT = {
  sky: {
    dot: 'bg-sky-500',
    hover: 'hover:bg-sky-50',
    selected: 'bg-sky-100 text-sky-600 ring-1 ring-sky-200',
    ring: 'focus-visible:ring-sky-500',
  },
  teal: {
    dot: 'bg-teal-500',
    hover: 'hover:bg-teal-50',
    selected: 'bg-teal-100 text-teal-600 ring-1 ring-teal-200',
    ring: 'focus-visible:ring-teal-500',
  },
}

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
  accent = 'sky',
}) {
  const palette = ACCENT[accent] || ACCENT.sky
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
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className={`mb-4 flex items-center ${hasNavigation ? 'justify-between gap-2' : 'justify-center'}`}>
        {hasNavigation && (
          <button
            type="button"
            onClick={onPrevMonth}
            disabled={!canGoPrev}
            aria-label="Previous month"
            className={`flex h-8 w-8 items-center justify-center rounded-control text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${palette.ring} disabled:cursor-not-allowed disabled:opacity-30`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <h3 className="text-center font-display text-[18px] font-semibold text-ink-800">{monthLabel}</h3>
        {hasNavigation && (
          <button
            type="button"
            onClick={onNextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
            className={`flex h-8 w-8 items-center justify-center rounded-control text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${palette.ring} disabled:cursor-not-allowed disabled:opacity-30`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[12px] font-medium text-slate-500">
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
                relative flex h-10 items-center justify-center rounded-control text-[15px] font-medium transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${palette.ring}
                ${isClickable ? `cursor-pointer ${palette.hover}` : 'cursor-default text-slate-400'}
                ${isSelected ? palette.selected : 'text-slate-800'}
              `}
            >
              {day}
              {isMarked && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${palette.dot}`}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {legend && <p className="mt-4 text-[12px] text-slate-500">{legend}</p>}
    </div>
  )
}

export default memo(MonthCalendar)
