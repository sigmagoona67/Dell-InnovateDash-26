import { requireInsforge } from '../lib/insforgeClient'

function formatInvokeError(error, data) {
  if (data?.error) {
    const msg = String(data.error)
    if (/unauthorized/i.test(msg)) {
      return 'Session expired. Please log out and sign in again.'
    }
    return msg
  }
  if (!error) return 'Unknown error'
  const status = error.statusCode || error.status
  if (status === 401) {
    return 'Session expired. Please log out and sign in again.'
  }
  if (status === 408 || status === 504 || status === 524) {
    return 'The AI took too long to respond. Please wait a moment and try again.'
  }
  const message = typeof error === 'string' ? error : error.message || ''
  if (/timeout|timed out|aborted|abort/i.test(message)) {
    return 'The AI took too long to respond. Please wait a moment and try again.'
  }
  if (typeof error === 'string') return error
  if (message && message !== '[object Object]') return message
  return error.statusText || error.code || 'Request failed'
}

async function ensureYouthAuthSession() {
  const { data, error } = await requireInsforge().auth.getCurrentUser()
  if (error || !data?.user) {
    throw new Error('Session expired. Please log out and sign in again.')
  }
  return data.user
}

export async function invokeYouthAi(action, payload = {}) {
  await ensureYouthAuthSession()

  let data
  let error
  try {
    const result = await requireInsforge().functions.invoke('youth-ai-chat', {
      body: { action, ...payload },
    })
    data = result.data
    error = result.error
  } catch (thrown) {
    const message = String(thrown?.message || '')
    if (/timeout|timed out|aborted/i.test(message)) {
      throw new Error('The AI took too long to respond. Please wait a moment and try again.')
    }
    throw new Error(thrown?.message || 'Network error calling youth-ai-chat')
  }

  if (error) throw new Error(formatInvokeError(error, data))
  if (data?.error) throw new Error(formatInvokeError({ statusCode: data?.statusCode }, data))
  return data
}

export async function syncProfileInsights(payload = {}) {
  return invokeYouthAi('syncProfileInsights', payload)
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
