import { useEffect, useMemo, useState } from 'react'
import { maxDateOfBirthForMinAge, normalizeIsoDate, isDobAtLeastMinAge } from '../../lib/onboardingData'

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

function parseIso(value) {
  const normalized = normalizeIsoDate(value)
  if (!normalized) return { year: '', month: '', day: '' }
  const [year, month, day] = normalized.split('-')
  return { year: year || '', month: month || '', day: day || '' }
}

function buildIso(year, month, day) {
  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

function daysInMonth(year, month) {
  if (!year || !month) return 31
  return new Date(Number(year), Number(month), 0).getDate()
}

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const selectClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100'

export default function DateOfBirthField({ value, onChange, minAge = null }) {
  const initial = parseIso(value)
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [day, setDay] = useState(initial.day)

  useEffect(() => {
    if (minAge != null && value && !isDobAtLeastMinAge(value, minAge)) {
      setYear('')
      setMonth('')
      setDay('')
      onChange('')
      return
    }

    const next = parseIso(value)
    setYear(next.year)
    setMonth(next.month)
    setDay(next.day)
    // onChange omitted — only sync display from `value`; invalid DOB cleared once above.
  }, [value, minAge])

  const today = useMemo(() => new Date(), [])
  const maxDate = minAge != null ? maxDateOfBirthForMinAge(minAge) : today
  const maxYear = maxDate.getFullYear()
  const minYear = today.getFullYear() - 100

  const years = useMemo(() => {
    const items = []
    for (let y = maxYear; y >= minYear; y -= 1) items.push(String(y))
    return items
  }, [maxYear, minYear])

  const months = useMemo(() => {
    if (!year) return MONTHS
    if (Number(year) < maxYear) return MONTHS
    if (Number(year) > maxYear) return []
    const maxMonth = maxDate.getMonth() + 1
    return MONTHS.filter((item) => Number(item.value) <= maxMonth)
  }, [year, maxYear, maxDate])

  const days = useMemo(() => {
    const total = daysInMonth(year, month)
    const items = []
    for (let d = 1; d <= total; d += 1) {
      const dayValue = String(d).padStart(2, '0')
      if (year && month && Number(year) === maxYear && Number(month) === maxDate.getMonth() + 1) {
        if (d > maxDate.getDate()) continue
      }
      items.push(dayValue)
    }
    return items
  }, [year, month, maxYear, maxDate])

  function emit(nextYear, nextMonth, nextDay) {
    if (!nextYear || !nextMonth || !nextDay) {
      onChange('')
      return
    }

    const maxDay = daysInMonth(nextYear, nextMonth)
    let safeDay = nextDay
    if (Number(safeDay) > maxDay) safeDay = String(maxDay).padStart(2, '0')

    const candidate = buildIso(nextYear, nextMonth, safeDay)
    const candidateDate = new Date(Number(nextYear), Number(nextMonth) - 1, Number(safeDay))
    if (toIsoDate(candidateDate) > toIsoDate(maxDate)) {
      onChange(toIsoDate(maxDate))
      const clamped = parseIso(toIsoDate(maxDate))
      setYear(clamped.year)
      setMonth(clamped.month)
      setDay(clamped.day)
      return
    }

    onChange(candidate)
  }

  function updateYear(nextYear) {
    setYear(nextYear)
    let nextMonth = month
    let nextDay = day
    if (nextMonth && !months.some((item) => item.value === nextMonth)) nextMonth = ''
    if (nextDay && nextMonth) {
      const maxDay = daysInMonth(nextYear, nextMonth)
      if (Number(nextDay) > maxDay) nextDay = String(maxDay).padStart(2, '0')
    }
    if (nextMonth !== month) setMonth(nextMonth)
    if (nextDay !== day) setDay(nextDay)
    emit(nextYear, nextMonth, nextDay)
  }

  function updateMonth(nextMonth) {
    setMonth(nextMonth)
    let nextDay = day
    if (nextDay) {
      const maxDay = daysInMonth(year, nextMonth)
      if (Number(nextDay) > maxDay) nextDay = String(maxDay).padStart(2, '0')
      if (nextDay !== day) setDay(nextDay)
    }
    emit(year, nextMonth, nextDay)
  }

  function updateDay(nextDay) {
    setDay(nextDay)
    emit(year, month, nextDay)
  }

  return (
    <div lang="en" className="grid grid-cols-3 gap-2 sm:gap-3">
      <select
        aria-label="Birth month"
        value={month}
        onChange={(e) => updateMonth(e.target.value)}
        className={selectClassName}
      >
        <option value="">Month</option>
        {months.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Birth day"
        value={day}
        onChange={(e) => updateDay(e.target.value)}
        className={selectClassName}
        disabled={!month}
      >
        <option value="">Day</option>
        {days.map((item) => (
          <option key={item} value={item}>
            {Number(item)}
          </option>
        ))}
      </select>

      <select
        aria-label="Birth year"
        value={year}
        onChange={(e) => updateYear(e.target.value)}
        className={selectClassName}
      >
        <option value="">Year</option>
        {years.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  )
}
