import cors from 'cors'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import {
  getCircuitStatus,
  isCircuitOpen,
  recordFailure,
  recordSuccess,
} from '../lib/circuitBreaker.js'
import { isEventBusConnected } from '../lib/eventBus.js'
import { attachMetrics } from '../lib/metrics.js'
import { traceMiddleware } from '../lib/traceMiddleware.js'
import { SERVICE_PORTS } from '../lib/config.js'
import { GATEWAY_SERVICES, getServiceTarget } from '../lib/serviceHosts.js'

const PORT = SERVICE_PORTS.gateway
const app = express()

app.use(cors({ origin: true, credentials: true }))

app.use(traceMiddleware('gateway'))
attachMetrics(app, 'gateway')

async function checkDependency(name) {
  const started = Date.now()
  try {
    const res = await fetch(`${getServiceTarget(name)}/health`, {
      signal: AbortSignal.timeout(4000),
    })
    const ok = res.ok
    if (ok) recordSuccess(name)
    else recordFailure(name)
    return { name, ok, latencyMs: Date.now() - started }
  } catch (error) {
    recordFailure(name)
    return { name, ok: false, error: error.message, latencyMs: Date.now() - started }
  }
}

app.get('/health', async (_req, res) => {
  const dependencies = await Promise.all(GATEWAY_SERVICES.map(([name]) => checkDependency(name)))
  const ok = dependencies.every((d) => d.ok)
  res.status(ok ? 200 : 503).json({
    ok,
    service: 'carebridge-api-gateway',
    eventBus: isEventBusConnected() ? 'redis' : 'in-memory',
    circuits: getCircuitStatus(),
    dependencies,
  })
})

app.get('/ready', async (_req, res) => {
  const critical = ['auth', 'profile', 'case']
  const checks = await Promise.all(critical.map((name) => checkDependency(name)))
  const ready = checks.every((c) => c.ok)
  res.status(ready ? 200 : 503).json({ ready, checks })
})

for (const [name] of GATEWAY_SERVICES) {
  app.use(`/api/v1/${name}`, (req, res, next) => {
    if (isCircuitOpen(name)) {
      return res.status(503).json({
        error: `Service temporarily unavailable: ${name}`,
        circuit: 'open',
      })
    }
    return next()
  })

  app.use(
    `/api/v1/${name}`,
    createProxyMiddleware({
      target: getServiceTarget(name),
      changeOrigin: true,
      pathRewrite: { [`^/api/v1/${name}`]: '' },
      proxyTimeout: 120000,
      timeout: 120000,
      on: {
        proxyReq: (proxyReq, req) => {
          if (req.headers.authorization) proxyReq.setHeader('Authorization', req.headers.authorization)
        },
        proxyRes: () => recordSuccess(name),
        error: (err, _req, res) => {
          recordFailure(name)
          console.error(`[gateway] proxy error ${name}:`, err.message)
          if (!res.headersSent) {
            res.status(502).json({ error: `Upstream ${name} failed`, detail: err.message })
          }
        },
      },
    }),
  )
}

app.use((err, _req, res, _next) => {
  console.error('[gateway]', err)
  res.status(500).json({ error: err.message || 'Gateway error' })
})

app.listen(PORT, process.env.BIND_HOST || '0.0.0.0', () => {
  console.log(`[gateway] listening on :${PORT}`)
  for (const [name] of GATEWAY_SERVICES) {
    console.log(`  /api/v1/${name} -> ${getServiceTarget(name)}`)
  }
})
