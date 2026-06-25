import { Router } from 'express'
import { expressToWebRequest } from '../../lib/webAdapter.js'
import { loadYouthAiHandler } from '../../edge/loadHandlers.mjs'
import { publishEvent } from '../../lib/eventBus.js'

const router = Router()
let handlerPromise = null

function getHandler() {
  if (!handlerPromise) handlerPromise = loadYouthAiHandler()
  return handlerPromise
}

async function maybePublishCrisisEvent(payload, req) {
  if (!payload || typeof payload !== 'object') return
  const crisisDetected = Boolean(payload.crisisDetected)
  const riskLevel = String(payload.riskLevel || '').toLowerCase()
  if (!crisisDetected && riskLevel !== 'high') return
  await publishEvent('crisis.detected', {
    riskLevel: riskLevel || 'high',
    crisisDetected: true,
    sessionId: req.body?.sessionId || null,
    userId: req.user?.id || null,
    action: req.body?.action || 'sendMessage',
  })
}

router.post('/invoke', async (req, res) => {
  try {
    const handler = await getHandler()
    const webReq = expressToWebRequest(req)
    const webRes = await handler(webReq)
    const text = await webRes.text()
    let payload = null
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
    await maybePublishCrisisEvent(payload, req).catch(() => {})
    res.status(webRes.status)
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value)
    })
    try {
      res.send(JSON.parse(text))
    } catch {
      res.send(text)
    }
  } catch (error) {
    console.error('[ai-chat invoke]', error)
    res.status(500).json({ error: error.message || 'AI chat failed' })
  }
})

export default router
