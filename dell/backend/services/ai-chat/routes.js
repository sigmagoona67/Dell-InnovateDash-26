import { Router } from 'express'
import { createDataRouter } from '../../lib/dataRouter.js'

const router = Router()
router.use(createDataRouter(['ai_chat_sessions', 'ai_messages']))
export default router
