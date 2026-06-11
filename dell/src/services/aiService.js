import { requireInsforge } from '../lib/insforgeClient'

export async function invokeYouthAi(action, payload = {}) {
  const { data, error } = await requireInsforge().functions.invoke('youth-ai-chat', {
    body: { action, ...payload },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function recordMood(sessionId, mood) {
  return invokeYouthAi('recordMood', { sessionId, mood })
}

export async function sendChatMessage(sessionId, message) {
  return invokeYouthAi('sendMessage', { sessionId, message })
}

export async function fetchGreeting() {
  return invokeYouthAi('greeting')
}
