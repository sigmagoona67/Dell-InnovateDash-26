const STORAGE_KEY = 'carebridge-auth-session-v1'

export function readPersistedAuthSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writePersistedAuthSession(session) {
  if (typeof window === 'undefined' || !session?.accessToken) return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken || null,
      user: session.user || null,
      savedAt: Date.now(),
    }),
  )
}

export function clearPersistedAuthSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function applyAuthSessionToClient(client, session) {
  if (!client || !session?.accessToken) return
  client.setAccessToken(session.accessToken)
  const http = client.getHttpClient()
  if (session.refreshToken) {
    http.setRefreshToken(session.refreshToken)
  }
}

export async function refreshAuthSessionWithToken(client, refreshToken) {
  if (!client || !refreshToken) return null
  const http = client.getHttpClient()
  try {
    const response = await Promise.race([
      http.post(
        '/api/auth/refresh?client_type=mobile',
        { refresh_token: refreshToken },
        { skipAuthRefresh: true, credentials: 'include' },
      ),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('refresh timed out')), 20000)
      }),
    ])
    if (!response?.accessToken) return null
    const session = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || refreshToken,
      user: response.user || null,
    }
    applyAuthSessionToClient(client, session)
    writePersistedAuthSession(session)
    return session
  } catch (error) {
    console.warn('[auth] refresh token restore failed:', error?.message || error)
    return null
  }
}

export async function validateStoredAccessToken(client, accessToken) {
  if (!client || !accessToken) return null
  client.setAccessToken(accessToken)
  try {
    const response = await Promise.race([
      client.getHttpClient().get('/api/auth/sessions/current'),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('session validate timed out')), 15000)
      }),
    ])
    return response?.user || null
  } catch {
    return null
  }
}
