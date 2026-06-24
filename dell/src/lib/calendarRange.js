import { formatAppMonthYear } from './locale'

/** Rolling window: current month through the month after next year's same month (e.g. Jun 2026 → Jul 2027). */
export function getCalendarWindow(now = new Date()) {
  const minYear = now.getFullYear()
  const minMonth = now.getMonth() + 1

  const maxDate = new Date(now.getFullYear(), now.getMonth() + 13, 1)
  return {
    minYear,
    minMonth,
    maxYear: maxDate.getFullYear(),
    maxMonth: maxDate.getMonth() + 1,
  }
}

export function compareMonth(year, month, otherYear, otherMonth) {
  if (year !== otherYear) return year - otherYear
  return month - otherMonth
}

export function canNavigateMonth(year, month, direction, window = getCalendarWindow()) {
  if (direction === 'prev') {
    return compareMonth(year, month, window.minYear, window.minMonth) > 0
  }
  return compareMonth(year, month, window.maxYear, window.maxMonth) < 0
}

export function shiftMonth(year, month, delta) {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getInitialCalendarMonth(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function getWindowLabel(window = getCalendarWindow()) {
  const minLabel = formatAppMonthYear(window.minYear, window.minMonth)
  const maxLabel = formatAppMonthYear(window.maxYear, window.maxMonth)
  return `${minLabel} – ${maxLabel}`
}
