import { Router } from 'express'
import { createDataRouter } from '../../lib/dataRouter.js'

const router = Router()
router.use(
  createDataRouter([
    'staff_schedule_slots',
    'staff_schedule_day_notes',
    'youth_free_slots',
    'consultation_requests',
  ]),
)
export default router
