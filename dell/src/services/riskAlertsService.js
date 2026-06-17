import { requireInsforge } from '../lib/insforgeClient'
import { bootstrapStaffSession } from './staffService'

function db() {
  return requireInsforge().database
}

function isMissingTableError(error) {
  if (!error) return false
  const message = String(error.message || error.details || error.hint || '').toLowerCase()
  const status = error.status ?? error.statusCode
  return (
    status === 404 ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('does not exist') ||
    (message.includes('relation') && message.includes('exist'))
  )
}

function formatAlertTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export async function getOpenRiskAlerts() {
  const { staffProfile } = await bootstrapStaffSession()

  const { data: alerts, error } = await db()
    .from('risk_alerts')
    .select('*')
    .in('status', ['open', 'acknowledged'])
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) return []
    throw error
  }

  if (!alerts?.length) return []

  const youthIds = [...new Set(alerts.map((row) => row.youth_id))]

  const { data: youthRows, error: youthError } = await db()
    .from('youth_profiles')
    .select('id, preferred_name, user_id, assigned_staff_id, assignment_status')
    .in('id', youthIds)

  if (youthError) throw youthError

  const userIds = (youthRows || []).map((row) => row.user_id)
  const { data: profiles, error: profileError } = await db()
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds)

  if (profileError) throw profileError

  const youthMap = Object.fromEntries((youthRows || []).map((row) => [row.id, row]))
  const profileMap = Object.fromEntries((profiles || []).map((row) => [row.id, row]))

  return alerts
    .filter((alert) => {
      if (alert.assigned_staff_id) {
        return alert.assigned_staff_id === staffProfile.id
      }
      return true
    })
    .map((alert) => {
      const youth = youthMap[alert.youth_id]
      const profile = youth ? profileMap[youth.user_id] : null
      const name =
        youth?.preferred_name || profile?.display_name || profile?.email?.split('@')[0] || 'Youth'

      return {
        id: alert.id,
        youthId: alert.youth_id,
        sessionId: alert.session_id,
        youthName: name,
        riskLevel: alert.risk_level,
        aiSummary: alert.ai_summary || 'High-risk AI chat flagged for staff review.',
        triggerMessage: alert.trigger_message,
        status: alert.status,
        isPendingYouth: !youth?.assigned_staff_id,
        assignedStaffId: alert.assigned_staff_id,
        createdAt: alert.created_at,
        createdAtLabel: formatAlertTime(alert.created_at),
        acknowledgedAt: alert.acknowledged_at,
      }
    })
}

export async function acknowledgeRiskAlert(alertId) {
  const { staffProfile } = await bootstrapStaffSession()
  const now = new Date().toISOString()

  const { data, error } = await db()
    .from('risk_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: staffProfile.id,
      acknowledged_at: now,
    })
    .eq('id', alertId)
    .in('status', ['open'])
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Alert not found or already handled.')
  return data
}

export async function resolveRiskAlert(alertId) {
  const { staffProfile } = await bootstrapStaffSession()
  const now = new Date().toISOString()

  const { data, error } = await db()
    .from('risk_alerts')
    .update({
      status: 'resolved',
      acknowledged_by: staffProfile.id,
      acknowledged_at: now,
      resolved_at: now,
    })
    .eq('id', alertId)
    .in('status', ['open', 'acknowledged'])
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Alert not found or already resolved.')
  return data
}
