const STORAGE_PREFIX = 'carebridge-youth-assignment'

function storageKey(youthId) {
  return `${STORAGE_PREFIX}-${youthId}`
}

export function readStoredAssignmentState(youthId) {
  try {
    const value = localStorage.getItem(storageKey(youthId))
    return value === null ? null : value
  } catch {
    return null
  }
}

export function writeStoredAssignmentState(youthId, assignedStaffId) {
  try {
    localStorage.setItem(storageKey(youthId), assignedStaffId || 'unassigned')
  } catch {
    // ignore quota / private mode
  }
}

/** True when youth moved from unassigned → assigned since the last stored state. */
export function detectNewYouthAssignment(youthId, assignedStaffId) {
  const current = assignedStaffId || 'unassigned'
  const previous = readStoredAssignmentState(youthId)

  if (previous === null) {
    writeStoredAssignmentState(youthId, assignedStaffId)
    return false
  }

  const isNewAssignment = previous === 'unassigned' && current !== 'unassigned'
  writeStoredAssignmentState(youthId, assignedStaffId)
  return isNewAssignment
}
