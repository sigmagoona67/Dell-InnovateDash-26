/** Shared copy for staff/youth portal role enforcement (matches lifei branch). */
export function buildRoleMismatchError(registeredRole) {
  return `Role mismatch. This account is registered as ${registeredRole}. Please use the correct portal.`
}

export function isRoleMismatchError(error) {
  return String(error?.message || '').toLowerCase().includes('role mismatch')
}
