import { Router } from 'express'
import { createDataRouter } from '../../lib/dataRouter.js'
import { onboardingRouter } from './onboardingRoutes.js'

const router = Router()
router.use(createDataRouter(['youth_questionnaire', 'staff_questionnaire']))
router.use(onboardingRouter)
export default router
