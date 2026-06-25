import Redis from 'ioredis'

const STREAM_KEY = process.env.EVENT_STREAM_KEY || 'carebridge:events'
const REDIS_URL = process.env.REDIS_URL || ''

let redis = null
let redisReady = false
const memoryEvents = []

function getRedis() {
  if (!REDIS_URL) return null
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableReadyCheck: true,
    })
    redis.on('ready', () => {
      redisReady = true
    })
    redis.on('error', (err) => {
      console.warn('[eventBus] redis error:', err.message)
      redisReady = false
    })
    redis.connect().catch(() => {})
  }
  return redis
}

export function isEventBusConnected() {
  return Boolean(REDIS_URL && redisReady)
}

/** Publish domain event (Redis Streams with in-memory fallback). */
export async function publishEvent(type, payload = {}) {
  const event = { type, payload, at: new Date().toISOString() }
  const client = getRedis()
  if (client && redisReady) {
    await client.xadd(STREAM_KEY, '*', 'type', type, 'data', JSON.stringify(payload), 'at', event.at)
    return event
  }
  memoryEvents.push(event)
  if (memoryEvents.length > 500) memoryEvents.shift()
  return event
}

/** Subscribe to events — used by notification service. */
export async function consumeEvents({ group = 'notification', consumer = 'worker-1', handler, blockMs = 5000 } = {}) {
  const client = getRedis()
  if (!client) {
    console.log('[eventBus] REDIS_URL not set — using in-process polling fallback')
    let cursor = memoryEvents.length
    setInterval(() => {
      while (cursor < memoryEvents.length) {
        const event = memoryEvents[cursor++]
        handler(event).catch((err) => console.error('[eventBus] handler error:', err.message))
      }
    }, 1000)
    return
  }

  try {
    await client.xgroup('CREATE', STREAM_KEY, group, '0', 'MKSTREAM')
  } catch (err) {
    if (!String(err.message).includes('BUSYGROUP')) throw err
  }

  console.log(`[eventBus] consuming ${STREAM_KEY} as ${group}/${consumer}`)
  for (;;) {
    try {
      const rows = await client.xreadgroup('GROUP', group, consumer, 'COUNT', 10, 'BLOCK', blockMs, 'STREAMS', STREAM_KEY, '>')
      if (!rows) continue
      for (const [, messages] of rows) {
        for (const [id, fields] of messages) {
          const type = fields[fields.indexOf('type') + 1]
          const dataRaw = fields[fields.indexOf('data') + 1]
          const at = fields[fields.indexOf('at') + 1]
          let payload = {}
          try {
            payload = JSON.parse(dataRaw)
          } catch {
            payload = { raw: dataRaw }
          }
          await handler({ type, payload, at, id })
          await client.xack(STREAM_KEY, group, id)
        }
      }
    } catch (err) {
      console.error('[eventBus] consume loop:', err.message)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

export async function readRecentEvents(limit = 50) {
  const client = getRedis()
  if (client && redisReady) {
    const rows = await client.xrevrange(STREAM_KEY, '+', '-', 'COUNT', limit)
    return rows
      .map(([, fields]) => {
        const type = fields[fields.indexOf('type') + 1]
        const dataRaw = fields[fields.indexOf('data') + 1]
        const at = fields[fields.indexOf('at') + 1]
        let payload = {}
        try {
          payload = JSON.parse(dataRaw)
        } catch {
          payload = {}
        }
        return { type, payload, at }
      })
      .reverse()
  }
  return memoryEvents.slice(-limit)
}
