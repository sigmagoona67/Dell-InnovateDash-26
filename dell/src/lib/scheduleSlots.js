export const DEFAULT_SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]

export function hourToTime(hour) {
  return `${String(hour).padStart(2, '0')}:00:00`
}

export function hourToEndTime(hour) {
  return `${String(hour + 1).padStart(2, '0')}:00:00`
}

export function formatHourLabel(hour) {
  const display = hour % 12 || 12
  const suffix = hour < 12 ? 'AM' : 'PM'
  return `${display}:00 ${suffix}`
}

export function formatTimeRange(startHour) {
  return `${formatHourLabel(startHour)} – ${formatHourLabel(startHour + 1)}`
}

export function buildDefaultSlots() {
  return DEFAULT_SLOT_HOURS.map((hour) => ({
    startHour: hour,
    startTime: hourToTime(hour),
    endTime: hourToEndTime(hour),
    label: formatTimeRange(hour),
  }))
}
