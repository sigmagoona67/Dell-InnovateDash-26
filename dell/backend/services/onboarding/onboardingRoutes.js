import { Router } from 'express'
import { executeQuery } from '../../lib/queryHandler.js'
import { requireAuth } from '../../lib/authMiddleware.js'

export const onboardingRouter = Router()

async function saveQuestionnaire(req, res, table, idColumn, idValue, payload) {
  const existing = await executeQuery({
    userId: req.user.id,
    table,
    operation: 'select',
    filters: [{ column: idColumn, op: 'eq', value: idValue }],
    maybeSingle: true,
  })

  if (existing.error) throw new Error(existing.error.message)

  const result = existing.data
    ? await executeQuery({
        userId: req.user.id,
        table,
        operation: 'update',
        body: payload,
        filters: [{ column: idColumn, op: 'eq', value: idValue }],
        single: true,
      })
    : await executeQuery({
        userId: req.user.id,
        table,
        operation: 'insert',
        body: { [idColumn]: idValue, ...payload },
        single: true,
      })

  if (result.error) throw new Error(result.error.message)
  return result.data
}

onboardingRouter.post('/staff/questionnaire', requireAuth, async (req, res) => {
  try {
    const { staffProfileId, payload } = req.body || {}
    if (!staffProfileId || !payload) return res.status(400).json({ error: 'staffProfileId and payload are required.' })
    const data = await saveQuestionnaire(req, res, 'staff_questionnaire', 'staff_id', staffProfileId, payload)
    return res.json({ ok: true, data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

onboardingRouter.post('/youth/questionnaire', requireAuth, async (req, res) => {
  try {
    const { youthId, payload } = req.body || {}
    if (!youthId || !payload) return res.status(400).json({ error: 'youthId and payload are required.' })
    const data = await saveQuestionnaire(req, res, 'youth_questionnaire', 'youth_id', youthId, payload)
    return res.json({ ok: true, data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})
