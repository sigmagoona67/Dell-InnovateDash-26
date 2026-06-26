import { Router } from 'express'
import { createDataRouter } from '../../lib/dataRouter.js'

const router = Router()
router.use(createDataRouter(['assigned_workers', 'staff_youth_views']))
export default router
