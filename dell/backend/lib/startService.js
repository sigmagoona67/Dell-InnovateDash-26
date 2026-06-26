import { SERVICE_PORTS } from './config.js'
import { attachMetrics } from './metrics.js'
import { traceMiddleware } from './traceMiddleware.js'

const BIND_HOST = process.env.BIND_HOST || '0.0.0.0'

export function startService(app, serviceName, portKey) {
  const port = SERVICE_PORTS[portKey]
  if (!port) throw new Error(`Unknown port key: ${portKey}`)
  app.use(traceMiddleware(serviceName))
  attachMetrics(app, serviceName)
  app.listen(port, BIND_HOST, () => {
    console.log(`[${serviceName}] listening on ${BIND_HOST}:${port}`)
  })
}
