import cors from 'cors'
import express from 'express'
import { authMiddleware } from '../../lib/authMiddleware.js'
import { startService } from '../../lib/startService.js'
import { authRouter } from './routes.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '4mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, service: 'auth' }))
app.use(authMiddleware)
app.use('/', authRouter)
startService(app, 'auth', 'auth')
