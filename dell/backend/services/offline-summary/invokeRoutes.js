import { Router } from 'express'
import { expressToWebRequest, sendWebResponse } from '../../lib/webAdapter.js'
import { loadStaffAiHandler } from '../../edge/loadHandlers.mjs'

const router = Router()
let handlerPromise = null

function getHandler() {
  if (!handlerPromise) handlerPromise = loadStaffAiHandler()
  return handlerPromise
}

router.post('/invoke', async (req, res) => {
  try {
    const handler = await getHandler()
    const webReq = expressToWebRequest(req)
    const webRes = await handler(webReq)
    await sendWebResponse(res, webRes)
  } catch (error) {
    console.error('[offline-summary invoke]', error)
    res.status(500).json({ error: error.message || 'Staff AI assist failed' })
  }
})

export default router
