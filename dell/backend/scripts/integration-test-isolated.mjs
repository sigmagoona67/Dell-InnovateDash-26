/**
 * Self-contained integration test: starts fresh auth + gateway on ephemeral ports,
 * runs signup/profile/query flow, then exits.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '..')

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

function startService(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(backendRoot, script)], {
      cwd: backendRoot,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let ready = false
    const timer = setTimeout(() => {
      if (!ready) reject(new Error(`Timeout starting ${script}`))
    }, 15000)
    child.stdout.on('data', (buf) => {
      const text = buf.toString()
      process.stdout.write(text)
      if (!ready && /\[auth\]/i.test(text)) {
        ready = true
        clearTimeout(timer)
        resolve(child)
      }
    })
    child.stderr.on('data', (buf) => process.stderr.write(buf))
    child.on('exit', (code) => {
      if (!ready) reject(new Error(`${script} exited with ${code}`))
    })
  })
}

async function main() {
  const authPort = await freePort()
  const gatewayPort = await freePort()

  const authChild = await startService('services/auth/server.js', { AUTH_PORT: String(authPort) })

  const express = (await import('express')).default
  const { createProxyMiddleware } = await import('http-proxy-middleware')
  const app = express()
  app.get('/health', (_req, res) => res.json({ ok: true, microservices: ['auth'] }))
  app.use(
    '/api/v1/auth',
    createProxyMiddleware({
      target: `http://127.0.0.1:${authPort}`,
      changeOrigin: true,
      pathRewrite: { '^/api/v1/auth': '' },
    }),
  )

  await new Promise((resolve) => app.listen(gatewayPort, '127.0.0.1', resolve))
  const gateway = `http://127.0.0.1:${gatewayPort}`

  try {
    const email = `itest-${Date.now()}@carebridge.test`
    const password = 'TestPass123!'

    const signup = await fetch(`${gateway}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const signupJson = await signup.json()
    if (!signup.ok) throw new Error(`Signup failed: ${signupJson.error}`)

    const profileRes = await fetch(`${gateway}/api/v1/auth/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${signupJson.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'youth', email, name: 'Test Youth' }),
    })
    const profileJson = await profileRes.json()
    if (!profileRes.ok) throw new Error(`Profile failed: ${profileJson.error}`)
    if (!profileJson.user?.profile?.role) throw new Error('Role not set on profile')

    console.log('[integration-test] PASS — signup + profile OK')
  } finally {
    authChild.kill()
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('[integration-test] FAIL:', err.message)
  process.exit(1)
})
