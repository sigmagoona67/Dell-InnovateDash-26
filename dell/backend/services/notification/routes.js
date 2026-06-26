import { Router } from 'express'
import { isEventBusConnected, readRecentEvents } from '../../lib/eventBus.js'

const router = Router()
const notifications = []

export function storeNotification(event) {
  const note = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: event.type,
    payload: event.payload,
    at: event.at || new Date().toISOString(),
    summary: event.summary || event.type,
  }
  notifications.push(note)
  if (notifications.length > 200) notifications.shift()
  return note
}

router.get('/events', async (_req, res) => {
  const streamEvents = await readRecentEvents(50)
  res.json({
    events: streamEvents.length ? streamEvents : notifications.slice(-50),
    transport: isEventBusConnected() ? 'redis-streams' : 'in-memory',
  })
})

router.get('/inbox', (_req, res) => {
  res.json({ notifications: notifications.slice(-50).reverse() })
})

router.post('/emit', async (req, res) => {
  const { publishEvent } = await import('../../lib/eventBus.js')
  const event = await publishEvent(req.body?.type || 'manual.event', req.body?.payload || req.body)
  storeNotification(event)
  res.json({ ok: true, event })
})

export default router
