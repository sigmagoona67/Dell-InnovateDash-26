export const APP_LOCALE = 'en-SG'

export function formatAppDate(value, options = {}) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(APP_LOCALE, options)
}

export function formatAppMonthYear(year, month) {
  return new Date(year, month - 1, 1).toLocaleString(APP_LOCALE, {
    month: 'long',
    year: 'numeric',
  })
}

export function formatAppDateTime(value, options = {}) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(APP_LOCALE, options)
}
