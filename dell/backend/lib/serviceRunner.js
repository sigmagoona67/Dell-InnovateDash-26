import cors from 'cors'
import express from 'express'
import { authMiddleware } from './authMiddleware.js'

export function createServiceApp({ name, mountPath, router, requireAuthForRouter = true }) {
  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '8mb' }))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: name })
  })

  if (requireAuthForRouter) {
    app.use(mountPath, authMiddleware, router)
  } else {
    app.use(mountPath, router)
  }

  app.use((error, _req, res, _next) => {
    console.error(`[${name}]`, error)
    const status = error.status || 500
    res.status(status).json({ error: error.message || 'Internal server error' })
  })

  return app
}

export function startService(app, port, name) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[${name}] listening on :${port}`)
      resolve(server)
    })
  })
}
