const DEFAULT_THRESHOLD = Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 5)
const DEFAULT_COOLDOWN_MS = Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS || 30000)

const state = new Map()

function getState(name) {
  if (!state.has(name)) {
    state.set(name, { failures: 0, openUntil: 0 })
  }
  return state.get(name)
}

export function isCircuitOpen(serviceName) {
  const s = getState(serviceName)
  if (s.openUntil && Date.now() < s.openUntil) return true
  if (s.openUntil && Date.now() >= s.openUntil) {
    s.failures = 0
    s.openUntil = 0
  }
  return false
}

export function recordSuccess(serviceName) {
  const s = getState(serviceName)
  s.failures = 0
  s.openUntil = 0
}

export function recordFailure(serviceName) {
  const s = getState(serviceName)
  s.failures += 1
  if (s.failures >= DEFAULT_THRESHOLD) {
    s.openUntil = Date.now() + DEFAULT_COOLDOWN_MS
    console.warn(`[circuitBreaker] OPEN ${serviceName} for ${DEFAULT_COOLDOWN_MS}ms`)
  }
}

export function getCircuitStatus() {
  return Object.fromEntries(
    [...state.entries()].map(([name, s]) => [
      name,
      {
        failures: s.failures,
        open: Boolean(s.openUntil && Date.now() < s.openUntil),
        openUntil: s.openUntil || null,
      },
    ]),
  )
}
