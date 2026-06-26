import client from 'prom-client'

const register = new client.Registry()
client.collectDefaultMetrics({ register, prefix: 'carebridge_' })

const httpRequestsTotal = new client.Counter({
  name: 'carebridge_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['service', 'method', 'route', 'status'],
  registers: [register],
})

const httpRequestDuration = new client.Histogram({
  name: 'carebridge_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['service', 'method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
})

export function attachMetrics(app, serviceName) {
  app.use((req, res, next) => {
    if (req.path === '/metrics' || req.path === '/health') return next()
    const start = process.hrtime.bigint()
    res.on('finish', () => {
      const route = req.route?.path || req.path.split('?')[0] || 'unknown'
      const labels = {
        service: serviceName,
        method: req.method,
        route,
        status: String(res.statusCode),
      }
      httpRequestsTotal.inc(labels)
      const elapsed = Number(process.hrtime.bigint() - start) / 1e9
      httpRequestDuration.observe(labels, elapsed)
    })
    next()
  })

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  })
}
