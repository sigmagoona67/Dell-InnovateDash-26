import { Router } from 'express'
import { createDataRouter } from '../../lib/dataRouter.js'

const router = Router()
router.use(createDataRouter(['offline_counselling_sessions']))
export default router
