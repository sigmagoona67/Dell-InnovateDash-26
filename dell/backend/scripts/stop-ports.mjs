import { execSync } from 'node:child_process'
import { SERVICE_PORTS } from '../lib/config.js'

const PORTS = [
  SERVICE_PORTS.gateway,
  SERVICE_PORTS.auth,
  SERVICE_PORTS.profile,
  SERVICE_PORTS.onboarding,
  SERVICE_PORTS.case,
  SERVICE_PORTS.reassignment,
  SERVICE_PORTS.team,
  SERVICE_PORTS['ai-chat'],
  SERVICE_PORTS['ai-insights'],
  SERVICE_PORTS.offline,
  SERVICE_PORTS['offline-summary'],
  SERVICE_PORTS.scheduling,
  SERVICE_PORTS['staff-edit'],
  SERVICE_PORTS.storage,
  SERVICE_PORTS.notification,
]

function pidsOnPortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue
      const parts = line.trim().split(/\s+/)
      const pid = Number(parts[parts.length - 1])
      if (pid > 0) pids.add(pid)
    }
    return [...pids]
  } catch {
    return []
  }
}

function killPidWindows(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function stopPorts() {
  let stopped = 0
  for (const port of PORTS) {
    const pids = process.platform === 'win32' ? pidsOnPortWindows(port) : []
    for (const pid of pids) {
      if (killPidWindows(pid)) {
        console.log(`[stop-ports] freed :${port} (pid ${pid})`)
        stopped++
      }
    }
  }
  if (!stopped) console.log('[stop-ports] no carebridge ports in use')
  return stopped
}

const isMain = process.argv[1]?.includes('stop-ports')
if (isMain) stopPorts()

export { stopPorts, PORTS }
