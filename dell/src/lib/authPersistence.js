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

export function hasPersistedAuthSession() {
  const session = readPersistedAuthSession()
  return Boolean(session?.accessToken || session?.refreshToken)
}

export function writePersistedAuthSession(session) {
  if (typeof window === 'undefined') return
  if (!session?.accessToken && !session?.refreshToken) return

  const existing = readPersistedAuthSession()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: session.accessToken || existing?.accessToken || null,
      refreshToken: session.refreshToken || existing?.refreshToken || null,
      user: session.user || existing?.user || null,
      savedAt: Date.now(),
    }),
  )
}

export function clearPersistedAuthSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function applyAuthSessionToClient(client, session) {
  if (!client || !session) return

  if (session.refreshToken) {
    client.getHttpClient().setRefreshToken(session.refreshToken)
  }

  if (session.accessToken) {
    client.setAccessToken(session.accessToken)
    if (session.user) {
      client.auth?.tokenManager?.setUser?.(session.user)
      client.auth?.tokenManager?.setAccessToken?.(session.accessToken)
    }
  }
}

/** On cold load: wire refresh token only — avoid pinning an expired access token before refresh. */
export function primeAuthClientFromPersistence(client) {
  const session = readPersistedAuthSession()
  if (!session) return null

  if (session.refreshToken) {
    client.getHttpClient().setRefreshToken(session.refreshToken)
  } else if (session.accessToken) {
    applyAuthSessionToClient(client, session)
  }

  return session
}

export function restoreAuthFromPersistence(client) {
  return primeAuthClientFromPersistence(client)
}

async function postRefresh(client, refreshToken) {
  const http = client.getHttpClient()
  const attempts = [
  { refresh_token: refreshToken },
    { refreshToken },
  ]

  let lastError = null
  for (const body of attempts) {
    try {
      const response = await Promise.race([
        http.post('/api/auth/refresh?client_type=mobile', body, {
          skipAuthRefresh: true,
          credentials: 'include',
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('refresh timed out')), 10000)
        }),
      ])
      if (response?.accessToken) return response
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) throw lastError
  return null
}

export async function refreshAuthSessionWithToken(client, refreshToken) {
  if (!client || !refreshToken) return null

  try {
    const response = await postRefresh(client, refreshToken)
    if (!response?.accessToken) return null

    const session = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || refreshToken,
      user: response.user || readPersistedAuthSession()?.user || null,
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
