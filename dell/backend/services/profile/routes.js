import { Router } from 'express'
import { createDataRouter } from '../../lib/dataRouter.js'

const router = Router()
router.use(createDataRouter(['profiles', 'youth_profiles', 'staff_profiles']))
export default router
