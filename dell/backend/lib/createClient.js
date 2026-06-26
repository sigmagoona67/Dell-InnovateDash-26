const GATEWAY_URL = process.env.CAREBRIDGE_API_URL || 'http://localhost:3001'

function readToken(token) {
  return typeof token === 'function' ? token() : token
}

function terminal(result) {
  return Promise.resolve(result)
}

class QueryBuilder {
  constructor(table, servicePath, token, serviceKey) {
    this.table = table
    this.servicePath = servicePath
    this.token = token
    this.serviceKey = serviceKey
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

  upsert(body, { onConflict } = {}) {
    this.operation = 'upsert'
    this.body = body
    this.upsertKey = onConflict
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
    const headers = { 'Content-Type': 'application/json' }
    const bearer = readToken(this.token)
    if (bearer) headers.Authorization = `Bearer ${bearer}`
    if (this.serviceKey) headers['x-service-key'] = this.serviceKey

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
      payload.body = Array.isArray(this.rows) ? this.rows : this.rows
    } else if (this.operation === 'upsert') {
      payload.body = Array.isArray(this.body) ? this.body[0] : this.body
    } else if (this.operation === 'update') {
      payload.body = this.body
    }

    const response = await fetch(`${GATEWAY_URL}${this.servicePath}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { data: null, error: { message: json.error || 'Query failed', code: json.code, status: response.status } }
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

function createDatabaseApi(token, serviceKey) {
  return {
    from(table) {
      const servicePath = TABLE_SERVICE_PATH[table] || '/api/v1/profile'
      return new QueryBuilder(table, servicePath, token, serviceKey)
    },
  }
}

function createAuthApi(token, refreshToken, setTokens) {
  async function authFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    const bearer = readToken(token)
    if (bearer) headers.Authorization = `Bearer ${bearer}`
    const response = await fetch(`${GATEWAY_URL}${path}`, { ...options, headers })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { data: null, error: { message: json.error || 'Auth failed', status: response.status, statusCode: response.status } }
    }
    return { data: json, error: null }
  }

  return {
    async signUp({ email, password }) {
      const result = await authFetch('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (!result.error && result.data?.accessToken) {
        token = result.data.accessToken
        refreshToken = result.data.refreshToken
        setTokens(token, refreshToken, result.data.user)
      }
      return { data: result.data, error: result.error }
    },
    async signInWithPassword({ email, password }) {
      const result = await authFetch('/api/v1/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (!result.error && result.data?.accessToken) {
        token = result.data.accessToken
        refreshToken = result.data.refreshToken
        setTokens(token, refreshToken, result.data.user)
      }
      return { data: result.data, error: result.error }
    },
    async signOut() {
      token = null
      refreshToken = null
      setTokens(null, null, null)
      return { error: null }
    },
    async getCurrentUser() {
      if (!token) return { data: { user: null }, error: null }
      const result = await authFetch('/api/v1/auth/me')
      if (result.error?.status === 401) return { data: { user: null }, error: result.error }
      return { data: { user: result.data?.user || null }, error: result.error }
    },
    async setProfile(profile) {
      const result = await authFetch('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      })
      if (!result.error && result.data?.user) {
        setTokens(token, refreshToken, result.data.user)
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
        token = result.data.accessToken
        refreshToken = result.data.refreshToken || refreshToken
        setTokens(token, refreshToken, result.data.user)
      }
      return { data: result.data, error: result.error }
    },
    tokenManager: {
      setUser(user) {},
      setAccessToken(t) {
        token = t
      },
    },
  }
}

export function createClient({ edgeFunctionToken, anonKey, serviceKey } = {}) {
  let accessToken = edgeFunctionToken || null
  let refreshToken = null
  let user = null

  function setTokens(at, rt, u) {
    accessToken = at
    refreshToken = rt
    user = u
  }

  const client = {
    database: createDatabaseApi(() => accessToken, serviceKey || anonKey),
    auth: createAuthApi(() => accessToken, () => refreshToken, setTokens),
    functions: {
      async invoke(name, { body } = {}) {
        const headers = { 'Content-Type': 'application/json' }
        const bearer = readToken(() => accessToken)
        if (bearer) headers.Authorization = `Bearer ${bearer}`
        const path =
          name === 'youth-ai-chat'
            ? '/api/v1/ai-chat/invoke'
            : name === 'staff-ai-assist'
              ? '/api/v1/offline-summary/invoke'
              : `/api/v1/functions/${name}`
        const response = await fetch(`${GATEWAY_URL}${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body || {}),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          return { data, error: { message: data.error || 'Function invoke failed', status: response.status, statusCode: response.status } }
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
