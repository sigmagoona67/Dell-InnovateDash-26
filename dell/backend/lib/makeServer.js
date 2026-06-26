function makeServer(name, portKey, routes, { auth = true } = {}) {
  return async () => {
    const [{ default: cors }, { default: express }, { authMiddleware }, { SERVICE_PORTS }] = await Promise.all([
      import('cors'),
      import('express'),
      import('../../lib/authMiddleware.js'),
      import('../../lib/config.js'),
    ])
    const app = express()
    app.use(cors({ origin: true, credentials: true }))
    app.use(express.json({ limit: '8mb' }))
    app.get('/health', (_req, res) => res.json({ ok: true, service: name }))
    if (auth) app.use(authMiddleware, routes)
    else app.use(routes)
    app.use((err, _req, res, _next) => {
      console.error(`[${name}]`, err)
      res.status(err.status || 500).json({ error: err.message || 'Internal error' })
    })
    const port = SERVICE_PORTS[portKey]
    app.listen(port, () => console.log(`[${name}] listening on :${port}`))
  }
}

export { makeServer }
