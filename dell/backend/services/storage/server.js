import cors from 'cors'
import express from 'express'
import { authMiddleware } from '../../lib/authMiddleware.js'
import { startService } from '../../lib/startService.js'
import routes from './routes.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '16mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'storage' }))
app.use(authMiddleware, routes)
startService(app, 'storage', 'storage')
