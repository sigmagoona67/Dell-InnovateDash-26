import { Router } from 'express'
import { executeQuery } from '../../lib/queryHandler.js'
import { requireAuth, requireStaff } from '../../lib/authMiddleware.js'

const router = Router()

router.post('/insights/:youthId', requireAuth, requireStaff, async (req, res) => {
  try {
    const { youthId } = req.params
    const { payload, staffProfileId } = req.body || {}
    const profile = await executeQuery({
      userId: req.user.id,
      table: 'ai_dynamic_insights',
      operation: 'select',
      filters: [{ column: 'youth_id', op: 'eq', value: youthId }],
      maybeSingle: true,
    })
    const row = {
      ...payload,
      youth_id: youthId,
      updated_by: staffProfileId,
      approved_at: new Date().toISOString(),
    }
    const result = profile.data
      ? await executeQuery({
          userId: req.user.id,
          table: 'ai_dynamic_insights',
          operation: 'update',
          body: row,
          filters: [{ column: 'youth_id', op: 'eq', value: youthId }],
          single: true,
        })
      : await executeQuery({
          userId: req.user.id,
          table: 'ai_dynamic_insights',
          operation: 'insert',
          body: row,
          single: true,
        })
    return res.json({ data: result.data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

export default router
