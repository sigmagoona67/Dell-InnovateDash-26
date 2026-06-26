const GATEWAY = process.env.CAREBRIDGE_API_URL || 'http://127.0.0.1:3001'

async function waitFor(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${url}/health`)
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

async function main() {
  console.log('[integration-test] waiting for gateway...')
  const ready = await waitFor(GATEWAY)
  if (!ready) throw new Error('Gateway not ready')

  const email = `test-${Date.now()}@carebridge.test`
  const password = 'TestPass123!'

  const signup = await fetch(`${GATEWAY}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const signupJson = await signup.json()
  if (!signup.ok) throw new Error(`Signup failed: ${signupJson.error}`)

  const token = signupJson.accessToken
  const profileRes = await fetch(`${GATEWAY}/api/v1/auth/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'youth', email, name: 'Test Youth' }),
  })
  const profileJson = await profileRes.json()
  if (!profileRes.ok) throw new Error(`Profile failed: ${profileJson.error}`)

  const youthToken = profileJson.accessToken || token
  const queryRes = await fetch(`${GATEWAY}/api/v1/profile/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${youthToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'profiles',
      operation: 'select',
      filters: [{ column: 'email', op: 'eq', value: email }],
      maybeSingle: true,
    }),
  })
  const queryJson = await queryRes.json()
  if (!queryRes.ok) throw new Error(`Query failed: ${queryJson.error}`)
  if (!queryJson.data) throw new Error('Profile row missing after signup')

  const servicesRes = await fetch(`${GATEWAY}/health`)
  const servicesJson = await servicesRes.json()
  console.log('[integration-test] gateway services:', servicesJson.microservices?.length)

  console.log('[integration-test] PASS — auth, profile, query OK')
}

main().catch((err) => {
  console.error('[integration-test] FAIL:', err.message)
  process.exit(1)
})
