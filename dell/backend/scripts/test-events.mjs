/**
 * Smoke test for domain events (event-driven architecture).
 */
const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3016'

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  const res = await fetch(`${GATEWAY}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `${res.status} ${path}`)
  return json
}

async function main() {
  const staff = await api('/api/v1/auth/signup', {
    method: 'POST',
    body: { email: `evt-staff-${Date.now()}@carebridge.test`, password: 'TestPass123!' },
  })

  await api('/api/v1/auth/profile', {
    method: 'PATCH',
    token: staff.accessToken,
    body: { role: 'staff', email: staff.user.email, name: 'Event Staff' },
  })

  const emitted = await api('/api/v1/notification/emit', {
    method: 'POST',
    token: staff.accessToken,
    body: { type: 'crisis.detected', payload: { riskLevel: 'high', crisisDetected: true } },
  })

  await new Promise((r) => setTimeout(r, 1500))

  const inbox = await api('/api/v1/notification/inbox', { token: staff.accessToken })
  const found = (inbox.notifications || []).some((n) => n.type === 'crisis.detected')

  console.log('emit ok:', emitted.ok)
  console.log('inbox types:', (inbox.notifications || []).slice(0, 3).map((n) => n.type))
  if (!found) throw new Error('crisis.detected not in notification inbox')
  console.log('[test-events] OK')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
