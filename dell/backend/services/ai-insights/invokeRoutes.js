import { Router } from 'express'
import { expressToWebRequest, sendWebResponse } from '../../lib/webAdapter.js'
import { loadStaffAiHandler } from '../../edge/loadHandlers.mjs'

const router = Router()
let handlerPromise = null

router.post('/invoke', async (req, res) => {
  try {
    const handler = await (handlerPromise || (handlerPromise = loadStaffAiHandler()))
    const webReq = expressToWebRequest(req)
    const webRes = await handler(webReq)
    await sendWebResponse(res, webRes)
  } catch (error) {
    console.error('[ai-insights invoke]', error)
    res.status(500).json({ error: error.message || 'AI insights regen failed' })
  }
})

export default router
