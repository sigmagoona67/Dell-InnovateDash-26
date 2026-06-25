const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthCalendar({ year, month, markedDays, selectedDay, onSelectDay }) {
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
          if (day === null) {
            return <div key={`empty-${index}`} />
          }

          const hasChat = markedDays.includes(day)
          const isSelected = selectedDay === day

          return (
            <button
              key={day}
              type="button"
              disabled={!hasChat}
              onClick={() => hasChat && onSelectDay(day)}
              className={`
                relative flex h-10 items-center justify-center rounded-control text-[15px] font-medium transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
                ${hasChat ? 'cursor-pointer hover:bg-sky-50' : 'cursor-default text-slate-400'}
                ${isSelected ? 'bg-sky-100 text-sky-600 ring-1 ring-sky-200' : 'text-slate-800'}
              `}
            >
              {day}
              {hasChat && (
                <span
                  className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-sky-500"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
