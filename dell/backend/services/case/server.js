import cors from 'cors'
import express from 'express'
import { authMiddleware } from '../../lib/authMiddleware.js'
import { startService } from '../../lib/startService.js'
import routes from './routes.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '8mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'case' }))
app.use(authMiddleware, routes)
startService(app, 'case', 'case')
