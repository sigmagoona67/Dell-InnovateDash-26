export const YOUTH_REASSIGNMENT_REASONS = [
  'Communication Style Mismatch',
  'Not Comfortable Sharing',
  'Language Preference',
  'Interest Mismatch',
  'Schedule Conflict',
  'Need Different Support',
  'Needs Have Changed',
  'Other',
]

export const OTHER_REASSIGNMENT_REASON = 'Other'

export function buildYouthReassignmentReason(selectedReason, otherDetails = '') {
  if (!selectedReason) return ''
  if (selectedReason === OTHER_REASSIGNMENT_REASON) {
    const trimmed = String(otherDetails || '').trim()
    return trimmed ? `Other: ${trimmed}` : ''
  }
  return selectedReason
}

export function formatReassignmentReasonDisplay(reason) {
  if (!reason) return ''
  if (reason.startsWith('Other: ')) {
    return reason.replace(/^Other: /, '')
  }
  return reason
}

export function getReassignmentReasonLabel(reason) {
  if (!reason) return ''
  if (reason.startsWith('Other: ')) return OTHER_REASSIGNMENT_REASON
  return reason
}
