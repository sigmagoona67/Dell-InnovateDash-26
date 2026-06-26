import { spawn } from 'node:child_process'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stopPorts } from './stop-ports.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '..')
const projectRoot = path.resolve(backendRoot, '..')

dotenv.config({ path: path.join(projectRoot, '.env.local') })
dotenv.config({ path: path.join(projectRoot, '.env') })

const childEnv = { ...process.env }
if (process.platform === 'win32') {
  const nodeOpts = childEnv.NODE_OPTIONS || ''
  if (!nodeOpts.includes('--use-system-ca')) {
    childEnv.NODE_OPTIONS = `${nodeOpts} --use-system-ca`.trim()
  }
}
if (process.env.OPENROUTER_API_KEY) {
  console.log('[start-all] OPENROUTER_API_KEY loaded — youth AI chat will use GPT')
} else {
  console.warn('[start-all] OPENROUTER_API_KEY missing — youth AI chat will use local fallback templates')
}

const skipStop = process.argv.includes('--no-stop')
if (!skipStop) {
  console.log('[start-all] stopping previous carebridge processes on ports 3001-3015...')
  stopPorts()
  await new Promise((r) => setTimeout(r, 800))
}

async function runInitDb() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/init-db.mjs'], { cwd: backendRoot, stdio: 'inherit' })
    child.on('exit', (code) => (code ? reject(new Error('db init failed')) : resolve()))
  })
}

try {
  await runInitDb()
} catch (error) {
  console.warn('[start-all] db init skipped (may already be applied):', error.message)
}

try {
  await new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/apply-schema-patches.mjs'], { cwd: backendRoot, stdio: 'inherit' })
    child.on('exit', (code) => (code ? reject(new Error('schema patch failed')) : resolve()))
  })
} catch (error) {
  console.warn('[start-all] schema patch skipped:', error.message)
}

const services = [
  'services/auth/server.js',
  'services/profile/server.js',
  'services/onboarding/server.js',
  'services/case/server.js',
  'services/reassignment/server.js',
  'services/team/server.js',
  'services/ai-chat/server.js',
  'services/ai-insights/server.js',
  'services/offline/server.js',
  'services/offline-summary/server.js',
  'services/scheduling/server.js',
  'services/staff-edit/server.js',
  'services/storage/server.js',
  'services/notification/server.js',
  'gateway/server.js',
]

const tsxServices = new Set([
  'services/ai-chat/server.js',
  'services/ai-insights/server.js',
  'services/offline-summary/server.js',
])

const children = []

for (const svc of services) {
  const scriptPath = path.join(backendRoot, svc)
  const useTsx = tsxServices.has(svc)
  const child = spawn(useTsx ? process.execPath : 'node', useTsx ? ['--import', 'tsx', scriptPath] : [scriptPath], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: childEnv,
  })
  children.push(child)
  child.on('exit', (code) => {
    if (code) console.error(`[start-all] ${svc} exited with code ${code}`)
  })
}

process.on('SIGINT', () => {
  for (const child of children) child.kill()
  process.exit(0)
})
