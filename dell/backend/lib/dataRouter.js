import { Router } from 'express'
import { publishEvent } from './eventBus.js'
import { executeQuery } from './queryHandler.js'

const EVENT_TABLES = {
  assigned_workers: 'youth.assigned',
  reassignment_requests: 'reassignment.requested',
  consultation_requests: 'consultation.requested',
  youth_free_slots: 'schedule.slot.submitted',
  offline_counselling_sessions: 'offline.session.updated',
}

function resolveEventType(table, operation, body) {
  const base = EVENT_TABLES[table]
  if (!base) return null

  if (table === 'offline_counselling_sessions') {
    if (operation !== 'update' && operation !== 'upsert') return null
    const status = String(body?.status || '').toLowerCase()
    if (status === 'approved') return 'offline.session.approved'
    if (status === 'pending') return 'offline.session.submitted'
    return null
  }

  if (table === 'youth_free_slots') {
    if (operation === 'insert' || operation === 'upsert') return base
    return null
  }

  if (operation === 'insert' || operation === 'upsert') return base
  return null
}

export function createDataRouter(allowedTables) {
  const router = Router()
  const allowed = new Set(allowedTables)

  router.post('/query', async (req, res) => {
    try {
      const { table, operation, select, filters, body, order, limit, single, maybeSingle, upsert } = req.body || {}
      if (!table || !allowed.has(table)) {
        return res.status(400).json({ error: `Table not allowed in this service: ${table}` })
      }
      const result = await executeQuery({
        userId: req.user?.id,
        serviceAuth: Boolean(req.serviceAuth),
        table,
        operation,
        select,
        filters,
        body,
        order,
        limit,
        single,
        maybeSingle,
        upsert,
      })
      const eventType = resolveEventType(table, operation, body)
      if (eventType) {
        publishEvent(eventType, { table, body, userId: req.user?.id }).catch(() => {})
      }
      return res.json(result)
    } catch (error) {
      const status = error.status || (error.code === 'PGRST116' ? 406 : 500)
      return res.status(status).json({ error: error.message, code: error.code })
    }
  })

  return router
}
