import { Router } from 'express'
import { query } from '../../lib/db.js'
import { getUserProfile } from '../../lib/auth.js'
import { requireAuth, requireStaff } from '../../lib/authMiddleware.js'

const router = Router()

router.get('/directory', requireAuth, requireStaff, async (req, res) => {
  try {
    const staffProfile = await getUserProfile(req.user.id)
    const { rows: staffRows } = await query(
      `SELECT p.id, p.display_name, p.email, sp.questionnaire_completed
       FROM public.profiles p
       JOIN public.staff_profiles sp ON sp.profile_id = p.id
       WHERE p.role = 'staff'
       ORDER BY p.display_name ASC`,
    )

    const { rows: youthRows } = await query(
      `SELECT yp.id, yp.preferred_name, yp.assigned_staff_id, yp.assignment_status, yp.onboarding_completed
       FROM public.youth_profiles yp
       WHERE yp.onboarding_completed = true`,
    )

    return res.json({ staff: staffRows, youth: youthRows, currentStaffId: staffProfile?.id })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

export default router
