import cors from 'cors'
import express from 'express'
import { authMiddleware } from '../../lib/authMiddleware.js'
import { startService } from '../../lib/startService.js'
import dataRoutes from './routes.js'
import invokeRoutes from './invokeRoutes.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '8mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'ai-insights' }))
app.use(authMiddleware, dataRoutes)
app.use(authMiddleware, invokeRoutes)
startService(app, 'ai-insights', 'ai-insights')
