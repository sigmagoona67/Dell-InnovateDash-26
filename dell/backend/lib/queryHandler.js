import { query, withUserContext } from './db.js'
import { getUserProfile } from './auth.js'

const TABLE_OWNERSHIP = {
  profiles: 'profile',
  youth_profiles: 'profile',
  staff_profiles: 'profile',
  youth_questionnaire: 'onboarding',
  staff_questionnaire: 'onboarding',
  assigned_workers: 'case',
  staff_youth_views: 'case',
  reassignment_requests: 'reassignment',
  ai_chat_sessions: 'ai-chat',
  ai_messages: 'ai-chat',
  ai_dynamic_insights: 'ai-insights',
  offline_counselling_sessions: 'offline',
  staff_schedule_slots: 'scheduling',
  staff_schedule_day_notes: 'scheduling',
  youth_free_slots: 'scheduling',
  consultation_requests: 'scheduling',
}

export function getTableOwner(table) {
  return TABLE_OWNERSHIP[table] || 'profile'
}

async function getProfileContext(userId) {
  const profile = await getUserProfile(userId)
  if (!profile) return null

  let youthId = null
  let staffProfileId = profile.id

  if (profile.role === 'youth') {
    const { rows } = await query('SELECT id FROM public.youth_profiles WHERE user_id = $1 LIMIT 1', [profile.id])
    youthId = rows[0]?.id || null
  }

  return { profile, youthId, staffProfileId: profile.role === 'staff' ? profile.id : null }
}

async function staffCanReadYouth(staffProfileId, youthId) {
  if (Array.isArray(youthId)) {
    return staffCanReadYouthBulk(staffProfileId, youthId)
  }

  const { rows } = await query(
    `SELECT 1 FROM public.youth_profiles yp
     WHERE yp.id = $1 AND yp.onboarding_completed = true
       AND (yp.assigned_staff_id = $2 OR (yp.assignment_status = 'pending' AND yp.assigned_staff_id IS NULL))
     LIMIT 1`,
    [youthId, staffProfileId],
  )
  return rows.length > 0
}

function youthIdsFromFilters(filters = [], payload = null) {
  const ids = new Set()
  if (payload?.youth_id) ids.add(String(payload.youth_id))
  for (const filter of filters || []) {
    if (filter.column !== 'youth_id') continue
    if (filter.op === 'in' && Array.isArray(filter.value)) {
      for (const id of filter.value) {
        if (id != null) ids.add(String(id))
      }
    } else if (filter.value != null) {
      ids.add(String(filter.value))
    }
  }
  return [...ids]
}

async function staffCanReadYouthBulk(staffProfileId, youthIds) {
  const ids = (Array.isArray(youthIds) ? youthIds : [youthIds]).filter(Boolean)
  if (!ids.length) return false
  const { rows } = await query(
    `SELECT COUNT(*)::int AS cnt FROM public.youth_profiles yp
     WHERE yp.id = ANY($1::uuid[]) AND yp.onboarding_completed = true
       AND (yp.assigned_staff_id = $2 OR (yp.assignment_status = 'pending' AND yp.assigned_staff_id IS NULL))`,
    [ids, staffProfileId],
  )
  return rows[0]?.cnt === ids.length
}

async function staffCanManageYouth(staffProfileId, youthId) {
  const { rows } = await query(
    `SELECT 1 FROM public.youth_profiles yp
     WHERE yp.id = $1 AND yp.assigned_staff_id = $2 LIMIT 1`,
    [youthId, staffProfileId],
  )
  return rows.length > 0
}

export async function authorizeDataOperation({ userId, serviceAuth, table, operation, payload, filters }) {
  if (serviceAuth) return true
  if (!userId) throw Object.assign(new Error('Unauthorized'), { status: 401 })

  if (table === 'profiles' && operation === 'insert') {
    const authUserId = payload?.auth_user_id
    if (authUserId && String(authUserId) === String(userId)) return true
  }

  const ctx = await getProfileContext(userId)
  if (!ctx?.profile) throw Object.assign(new Error('Profile not found'), { status: 403 })

  const { profile, youthId, staffProfileId } = ctx

  if (table === 'profiles') {
    if (operation === 'select') return true
    if (operation === 'update') {
      const targetId = payload?.auth_user_id || filters?.find((f) => f.column === 'auth_user_id')?.value
      if (targetId && String(targetId) !== String(userId) && profile.role !== 'staff') {
        throw Object.assign(new Error('Forbidden'), { status: 403 })
      }
      return true
    }
  }

  if (table === 'youth_profiles') {
    if (profile.role === 'youth') return true
    if (profile.role === 'staff' && ['select', 'update'].includes(operation)) return true
  }

  if (table === 'staff_profiles' || table === 'staff_questionnaire') {
    if (profile.role === 'staff') return true
    if (table === 'staff_questionnaire' && operation === 'select' && profile.role === 'youth') return true
  }

  if (table === 'youth_questionnaire') {
    if (profile.role === 'youth') return true
    if (profile.role === 'staff' && operation === 'select') {
      const youthIds = youthIdsFromFilters(filters, payload)
      if (youthIds.length && (await staffCanReadYouthBulk(staffProfileId, youthIds))) return true
      const yid = filters?.find((f) => f.column === 'youth_id' && f.op !== 'in')?.value || payload?.youth_id
      if (yid && (await staffCanReadYouth(staffProfileId, yid))) return true
    }
  }

  const youthScoped = [
    'ai_chat_sessions',
    'ai_messages',
    'ai_dynamic_insights',
    'offline_counselling_sessions',
    'youth_free_slots',
    'consultation_requests',
    'reassignment_requests',
    'assigned_workers',
    'staff_youth_views',
  ]

  if (youthScoped.includes(table)) {
    const yid =
      payload?.youth_id ||
      filters?.find((f) => f.column === 'youth_id')?.value ||
      (table === 'ai_messages' ? filters?.find((f) => f.column === 'youth_id')?.value : null)

    if (profile.role === 'youth') {
      if (yid && youthId && String(yid) !== String(youthId) && operation !== 'select') {
        throw Object.assign(new Error('Forbidden'), { status: 403 })
      }
      return true
    }

    if (profile.role === 'staff') {
      if (operation === 'select') {
        const youthIds = youthIdsFromFilters(filters, payload)
        if (youthIds.length && (await staffCanReadYouthBulk(staffProfileId, youthIds))) return true
        const yid =
          payload?.youth_id ||
          filters?.find((f) => f.column === 'youth_id' && f.op !== 'in')?.value
        if (yid && (await staffCanReadYouth(staffProfileId, yid))) return true
      }
      if (['insert', 'update', 'delete'].includes(operation)) {
        const yid =
          payload?.youth_id ||
          filters?.find((f) => f.column === 'youth_id' && f.op !== 'in')?.value
        if (yid && (await staffCanManageYouth(staffProfileId, yid))) return true
        if (table === 'ai_dynamic_insights' && operation === 'update') {
          const pending = await query(
            `SELECT 1 FROM public.youth_profiles WHERE id = $1 AND assignment_status = 'pending' LIMIT 1`,
            [yid],
          )
          if (pending.rows.length) return true
        }
      }
      if (table === 'assigned_workers' || table === 'staff_youth_views') return true
      if (table === 'reassignment_requests') return true
      if (table === 'consultation_requests') return true
    }
  }

  if (table.startsWith('staff_schedule')) {
    if (profile.role === 'staff') return true
  }

  return true
}

function serializeParam(value) {
  if (value === null || value === undefined) return value
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function paramExpr(value, index) {
  if (value !== null && typeof value === 'object') return `$${index}::jsonb`
  return `$${index}`
}

function serializeRow(row) {
  const out = {}
  for (const [key, value] of Object.entries(row)) {
    out[key] = serializeParam(value)
  }
  return out
}

function formatQueryValue(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  return value
}

function formatQueryRows(rows) {
  return rows.map((row) => {
    const out = {}
    for (const [key, value] of Object.entries(row)) {
      out[key] = formatQueryValue(value)
    }
    return out
  })
}

function buildWhere(filters = [], startIndex = 1) {
  const clauses = []
  const values = []
  let idx = startIndex
  for (const filter of filters) {
    const col = filter.column
    const op = filter.op || 'eq'
    if (op === 'eq') {
      clauses.push(`${col} = $${idx++}`)
      values.push(filter.value)
    } else if (op === 'in') {
      const vals = filter.value || []
      if (!vals.length) {
        clauses.push('FALSE')
        continue
      }
      const placeholders = vals.map(() => `$${idx++}`)
      clauses.push(`${col} IN (${placeholders.join(', ')})`)
      values.push(...vals)
    } else if (op === 'is') {
      clauses.push(filter.value === null ? `${col} IS NULL` : `${col} IS NOT NULL`)
    } else if (op === 'gte') {
      clauses.push(`${col} >= $${idx++}`)
      values.push(filter.value)
    } else if (op === 'gt') {
      clauses.push(`${col} > $${idx++}`)
      values.push(filter.value)
    } else if (op === 'lte') {
      clauses.push(`${col} <= $${idx++}`)
      values.push(filter.value)
    } else if (op === 'lt') {
      clauses.push(`${col} < $${idx++}`)
      values.push(filter.value)
    }
  }
  return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values, nextIndex: idx }
}

export async function executeQuery({ userId, serviceAuth = false, table, operation, select = '*', filters = [], body, order, limit, single, maybeSingle, upsert }) {
  await authorizeDataOperation({ userId, serviceAuth, table, operation, payload: body, filters })

  return withUserContext(serviceAuth ? null : userId, async (client) => {
    const run = async (sql, params) => {
      const result = await client.query(sql, params)
      return result.rows
    }

    if (operation === 'select') {
      const { clause, values } = buildWhere(filters)
      let sql = `SELECT ${select} FROM public.${table} ${clause}`
      if (order?.column) {
        sql += ` ORDER BY ${order.column} ${order.ascending === false ? 'DESC' : 'ASC'}`
      }
      if (limit) sql += ` LIMIT ${Number(limit)}`
      const rows = formatQueryRows(await run(sql, values))
      if (single) {
        if (!rows.length) throw Object.assign(new Error('Row not found'), { code: 'PGRST116' })
        return { data: rows[0], error: null }
      }
      if (maybeSingle) return { data: rows[0] || null, error: null }
      return { data: rows, error: null }
    }

    if (operation === 'insert') {
      const rows = Array.isArray(body) ? body : [body]
      const results = []
      for (const row of rows) {
        const normalized = serializeRow(row)
        const cols = Object.keys(normalized)
        const vals = Object.values(normalized)
        const placeholders = vals.map((v, i) => paramExpr(row[cols[i]], i + 1))
        const sql = `INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`
        const inserted = formatQueryRows(await run(sql, vals))
        results.push(inserted[0])
      }
      const data = single || maybeSingle ? results[0] : results
      return { data, error: null }
    }

    if (operation === 'update') {
      const normalized = serializeRow(body)
      if (table === 'profiles' && normalized.role) {
        const { clause, values } = buildWhere(filters)
        const existingRows = await run(`SELECT role FROM public.${table} ${clause} LIMIT 1`, values)
        const currentRole = existingRows[0]?.role
        if (currentRole && currentRole !== normalized.role) {
          throw Object.assign(
            new Error(
              `Role mismatch. This account is registered as ${currentRole}. Please use the correct portal.`,
            ),
            { status: 403 },
          )
        }
      }

      const cols = Object.keys(normalized)
      const vals = Object.values(normalized)
      const setClause = cols.map((c, i) => `${c} = ${paramExpr(body[c], i + 1)}`).join(', ')
      const { clause, values, nextIndex } = buildWhere(filters, vals.length + 1)
      const sql = `UPDATE public.${table} SET ${setClause} ${clause} RETURNING *`
      const rows = formatQueryRows(await run(sql, [...vals, ...values]))
      if (single && !rows.length) throw Object.assign(new Error('Row not found'), { code: 'PGRST116' })
      const data = maybeSingle || single ? rows[0] || null : rows
      return { data, error: null }
    }

    if (operation === 'delete') {
      const { clause, values } = buildWhere(filters)
      const sql = `DELETE FROM public.${table} ${clause} RETURNING *`
      const rows = formatQueryRows(await run(sql, values))
      return { data: maybeSingle || single ? rows[0] || null : rows, error: null }
    }

    if (operation === 'upsert') {
      const source = Array.isArray(body) ? body[0] : body
      const row = serializeRow({ ...source })
      const conflict = upsert || 'id'
      const cols = Object.keys(row)
      const vals = Object.values(row)
      const placeholders = vals.map((v, i) => paramExpr(body[cols[i]], i + 1))
      const updates = cols.filter((c) => c !== conflict).map((c) => `${c} = EXCLUDED.${c}`)
      const sql = `INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
        ON CONFLICT (${conflict}) DO UPDATE SET ${updates.join(', ')} RETURNING *`
      const rows = formatQueryRows(await run(sql, vals))
      return { data: rows[0], error: null }
    }

    throw new Error(`Unsupported operation: ${operation}`)
  })
}
