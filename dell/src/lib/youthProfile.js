const ONBOARDING_KEY = 'carebridge-youth-onboarding-complete'
const HAS_WORKER_KEY = 'carebridge-youth-has-worker'
const YOUTH_NAME_KEY = 'carebridge-youth-name'
const CHAT_STATE_KEY = 'carebridge-youth-chat-state'

export function getYouthProfile() {
  return {
    name: localStorage.getItem(YOUTH_NAME_KEY) || '',
    onboardingComplete: localStorage.getItem(ONBOARDING_KEY) === 'true',
    hasAssignedWorker: localStorage.getItem(HAS_WORKER_KEY) === 'true',
  }
}

export function setOnboardingComplete(complete = true) {
  localStorage.setItem(ONBOARDING_KEY, complete ? 'true' : 'false')
}

export function setHasAssignedWorker(hasWorker = true) {
  localStorage.setItem(HAS_WORKER_KEY, hasWorker ? 'true' : 'false')
}

export function setYouthName(name) {
  localStorage.setItem(YOUTH_NAME_KEY, name)
}

export function resetYouthDemoProfile() {
  localStorage.removeItem(ONBOARDING_KEY)
  localStorage.removeItem(HAS_WORKER_KEY)
  localStorage.removeItem(CHAT_STATE_KEY)
}

export function getChatState() {
  try {
    return JSON.parse(localStorage.getItem(CHAT_STATE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveChatState(state) {
  localStorage.setItem(CHAT_STATE_KEY, JSON.stringify(state))
}

export function applyDemoProfile(type) {
  if (type === 'existing') {
    setHasAssignedWorker(true)
    setOnboardingComplete(true)
  } else {
    setHasAssignedWorker(false)
    setOnboardingComplete(false)
  }
}
