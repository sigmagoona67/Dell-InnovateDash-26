import { Router } from 'express'
import { createDataRouter } from '../../lib/dataRouter.js'

const router = Router()
router.use(createDataRouter(['ai_dynamic_insights']))
export default router
