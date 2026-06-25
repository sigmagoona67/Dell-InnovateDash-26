const runtimeConfig =
  typeof window !== 'undefined' && window.__RUNTIME_CONFIG__ ? window.__RUNTIME_CONFIG__ : {}

const apiUrl = (
  import.meta.env.DEV
    ? ''
    : runtimeConfig.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001'
)
  .trim()
  .replace(/\/+$/, '')

const serviceKey = (runtimeConfig.VITE_SERVICE_KEY || import.meta.env.VITE_SERVICE_KEY || 'carebridge-service-key').trim()

export const isApiConfigured = true
export const apiConfigHint = isApiConfigured
  ? ''
  : 'Missing API configuration. Set VITE_API_URL (default http://localhost:3001).'

class QueryBuilder {
  constructor(table, servicePath, getToken) {
    this.table = table
    this.servicePath = servicePath
    this.getToken = getToken
    this.operation = 'select'
    this.selectCols = '*'
    this.filters = []
    this.body = null
    this.orderSpec = null
    this.limitVal = null
    this._single = false
    this._maybeSingle = false
    this.upsertKey = null
    this.rows = null
  }

  select(cols = '*') {
    this.selectCols = cols
    return this
  }

  insert(rows) {
    this.operation = 'insert'
    this.rows = rows
    return this
  }

  update(body) {
    this.operation = 'update'
    this.body = body
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  upsert(rows, { onConflict } = {}) {
    this.operation = 'upsert'
    this.rows = rows
    this.upsertKey = onConflict || 'id'
    return this
  }

  eq(column, value) {
    this.filters.push({ column, op: 'eq', value })
    return this
  }

  in(column, value) {
    this.filters.push({ column, op: 'in', value })
    return this
  }

  is(column, value) {
    this.filters.push({ column, op: 'is', value })
    return this
  }

  gte(column, value) {
    this.filters.push({ column, op: 'gte', value })
    return this
  }

  gt(column, value) {
    this.filters.push({ column, op: 'gt', value })
    return this
  }

  lte(column, value) {
    this.filters.push({ column, op: 'lte', value })
    return this
  }

  lt(column, value) {
    this.filters.push({ column, op: 'lt', value })
    return this
  }

  order(column, { ascending = true } = {}) {
    this.orderSpec = { column, ascending }
    return this
  }

  limit(n) {
    this.limitVal = n
    return this
  }

  single() {
    this._single = true
    return this.execute()
  }

  maybeSingle() {
    this._maybeSingle = true
    return this.execute()
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected)
  }

  async execute() {
    const token = this.getToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const payload = {
      table: this.table,
      operation: this.operation,
      select: this.selectCols,
      filters: this.filters,
      order: this.orderSpec,
      limit: this.limitVal,
      single: this._single,
      maybeSingle: this._maybeSingle,
      upsert: this.upsertKey,
    }

    if (this.operation === 'insert') {
      const row = Array.isArray(this.rows) ? this.rows[0] : this.rows
      payload.body = row
    } else if (this.operation === 'upsert') {
      const row = Array.isArray(this.rows) ? this.rows[0] : this.rows
      payload.body = row
    } else if (this.operation === 'update') {
      payload.body = this.body
    }

    const response = await fetch(`${apiUrl}${this.servicePath}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      const fallback =
        response.status === 502 || response.status === 503
          ? 'Backend service is unavailable. Please start the API server (backend: npm run start:all).'
          : `Query failed (${response.status})`
      return {
        data: null,
        error: { message: json.error || json.message || fallback, code: json.code, status: response.status },
      }
    }
    return { data: json.data, error: null }
  }
}

const TABLE_SERVICE_PATH = {
  profiles: '/api/v1/profile',
  youth_profiles: '/api/v1/profile',
  staff_profiles: '/api/v1/profile',
  youth_questionnaire: '/api/v1/onboarding',
  staff_questionnaire: '/api/v1/onboarding',
  assigned_workers: '/api/v1/case',
  staff_youth_views: '/api/v1/case',
  reassignment_requests: '/api/v1/reassignment',
  ai_chat_sessions: '/api/v1/ai-chat',
  ai_messages: '/api/v1/ai-chat',
  ai_dynamic_insights: '/api/v1/ai-insights',
  offline_counselling_sessions: '/api/v1/offline',
  staff_schedule_slots: '/api/v1/scheduling',
  staff_schedule_day_notes: '/api/v1/scheduling',
  youth_free_slots: '/api/v1/scheduling',
  consultation_requests: '/api/v1/scheduling',
}

function createCarebridgeClient() {
  let accessToken = null
  let refreshToken = null

  function getToken() {
    return accessToken
  }

  function setTokens(at, rt) {
    accessToken = at
    refreshToken = rt
  }

  async function authFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    const isPublicAuthRoute =
      path === '/api/v1/auth/signup' || path === '/api/v1/auth/signin' || path === '/api/v1/auth/refresh'
    if (accessToken && !isPublicAuthRoute) headers.Authorization = `Bearer ${accessToken}`
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      const fallback =
        response.status === 502 || response.status === 503
          ? 'Backend service is unavailable. Please start the API server (backend: npm run start:all).'
          : response.status === 404
            ? 'API endpoint not found. Check VITE_API_URL and that the gateway is running.'
            : `Request failed (${response.status})`
      return {
        data: null,
        error: {
          message: json.error || json.message || fallback,
          status: response.status,
          statusCode: response.status,
        },
      }
    }
    return { data: json, error: null }
  }

  const client = {
    database: {
      from(table) {
        const servicePath = TABLE_SERVICE_PATH[table] || '/api/v1/profile'
        return new QueryBuilder(table, servicePath, getToken)
      },
    },
    auth: {
      async signUp({ email, password }) {
        setTokens(null, null)
        const result = await authFetch('/api/v1/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        if (!result.error && result.data?.accessToken) {
          setTokens(result.data.accessToken, result.data.refreshToken)
        }
        return { data: result.data, error: result.error }
      },
      async signInWithPassword({ email, password }) {
        setTokens(null, null)
        const result = await authFetch('/api/v1/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        if (!result.error && result.data?.accessToken) {
          setTokens(result.data.accessToken, result.data.refreshToken)
        }
        return { data: result.data, error: result.error }
      },
      async signOut() {
        setTokens(null, null)
        return { error: null }
      },
      async getCurrentUser() {
        if (!accessToken) return { data: { user: null }, error: null }
        const result = await authFetch('/api/v1/auth/me')
        if (result.error?.status === 401) return { data: { user: null }, error: result.error }
        return { data: { user: result.data?.user || null }, error: result.error }
      },
      async setProfile(profile) {
        const result = await authFetch('/api/v1/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify(profile),
        })
        if (!result.error && result.data?.accessToken) {
          setTokens(result.data.accessToken, refreshToken)
        }
        return result
      },
      async refreshSession() {
        if (!refreshToken) return { data: null, error: { message: 'No refresh token' } }
        const result = await authFetch('/api/v1/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
        if (!result.error && result.data?.accessToken) {
          setTokens(result.data.accessToken, result.data.refreshToken || refreshToken)
        }
        return { data: result.data, error: result.error }
      },
      tokenManager: {
        setUser() {},
        setAccessToken(t) {
          accessToken = t
        },
      },
    },
    functions: {
      async invoke(name, { body } = {}) {
        const headers = { 'Content-Type': 'application/json' }
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`
        const path =
          name === 'youth-ai-chat'
            ? '/api/v1/ai-chat/invoke'
            : name === 'staff-ai-assist'
              ? '/api/v1/offline-summary/invoke'
              : `/api/v1/functions/${name}`
        const response = await fetch(`${apiUrl}${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body || {}),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          return {
            data,
            error: {
              message: data.error || 'Function invoke failed',
              status: response.status,
              statusCode: response.status,
            },
          }
        }
        return { data, error: null }
      },
    },
    setAccessToken(t) {
      accessToken = t
    },
    getHttpClient() {
      return {
        setRefreshToken(rt) {
          refreshToken = rt
        },
      }
    },
  }

  return client
}

export function getApiClient() {
  return requireInsforge()
}

/** @deprecated Use getApiClient — kept for gradual migration */
export const insforge = isApiConfigured ? createCarebridgeClient() : null
export const isInsforgeConfigured = isApiConfigured

export function requireInsforge() {
  if (!insforge) throw new Error(apiConfigHint || 'API client is not configured.')
  return insforge
}

export function requireInsforgeProfileSync() {
  return requireInsforge()
}

export function requireInsforgeLongRunning() {
  return requireInsforge()
}

export function getInsforge() {
  return insforge
}

export const insforgeConfigHint = apiConfigHint
