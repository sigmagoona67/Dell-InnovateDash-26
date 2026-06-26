import cors from 'cors'
import express from 'express'
import { authMiddleware } from '../../lib/authMiddleware.js'
import { consumeEvents } from '../../lib/eventBus.js'
import { createLogger } from '../../lib/logger.js'
import { startService } from '../../lib/startService.js'
import routes, { storeNotification } from './routes.js'

const log = createLogger('notification')

function summarizeEvent(event) {
  const p = event.payload || {}
  switch (event.type) {
    case 'youth.assigned':
      return 'Youth assigned to staff worker'
    case 'reassignment.requested':
      return 'Reassignment request submitted'
    case 'consultation.requested':
      return 'New consultation request'
    case 'schedule.slot.submitted':
      return 'Youth submitted availability slots'
    case 'offline.session.approved':
      return 'Offline counselling session approved'
    case 'offline.session.submitted':
      return 'Offline session uploaded for review'
    case 'crisis.detected':
      return `Crisis detected (risk: ${p.riskLevel || 'high'})`
    default:
      return event.type
  }
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '4mb' }))
app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'notification', transport: process.env.REDIS_URL ? 'redis' : 'in-memory' }),
)
app.use(authMiddleware, routes)

consumeEvents({
  handler: async (event) => {
    const note = storeNotification(event)
    note.summary = summarizeEvent(event)
    log.info('event.consumed', {
      type: event.type,
      summary: note.summary,
      traceId: event.payload?.traceId,
    })
  },
}).catch((err) => console.error('[notification] consumer failed:', err.message))

startService(app, 'notification', 'notification')
