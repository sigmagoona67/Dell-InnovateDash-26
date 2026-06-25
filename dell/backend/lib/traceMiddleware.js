import { randomUUID } from 'node:crypto'
import { createLogger } from './logger.js'

/** Lightweight request tracing — traceId in logs + x-trace-id header (Loki/Jaeger demo). */
export function traceMiddleware(serviceName) {
  const log = createLogger(serviceName)
  return (req, res, next) => {
    if (req.path === '/metrics' || req.path === '/health') return next()
    const traceId = req.headers['x-trace-id'] || randomUUID()
    const spanId = randomUUID().slice(0, 8)
    req.traceId = traceId
    req.spanId = spanId
    res.setHeader('x-trace-id', traceId)
    const start = Date.now()
    log.info('request.start', {
      traceId,
      spanId,
      method: req.method,
      path: req.path,
    })
    res.on('finish', () => {
      log.info('request.end', {
        traceId,
        spanId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      })
    })
    next()
  }
}
