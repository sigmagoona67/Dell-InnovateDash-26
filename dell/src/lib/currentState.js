import { buildConcreteCurrentState } from './livingMemory'

export function buildCurrentStateFromMessages() {
  return buildConcreteCurrentState()
}

export function resolveCurrentState({ saved = [] } = {}) {
  return Array.isArray(saved) ? saved : []
}
