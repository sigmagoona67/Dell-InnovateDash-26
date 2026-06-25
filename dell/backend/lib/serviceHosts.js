import { SERVICE_PORTS } from './config.js'

const DEFAULT_HOST = process.env.SERVICE_DEFAULT_HOST || '127.0.0.1'

/** K8s DNS names map to env vars e.g. AUTH_SERVICE_HOST=carebridge-auth */
const SERVICE_NAMES = [
  'auth',
  'profile',
  'onboarding',
  'case',
  'reassignment',
  'team',
  'ai-chat',
  'ai-insights',
  'offline',
  'offline-summary',
  'scheduling',
  'staff-edit',
  'storage',
  'notification',
]

function hostEnvKey(serviceName) {
  return `${serviceName.toUpperCase().replace(/-/g, '_')}_SERVICE_HOST`
}

export function getServiceHost(serviceName) {
  return process.env[hostEnvKey(serviceName)] || DEFAULT_HOST
}

export function getServiceTarget(serviceName) {
  const port = SERVICE_PORTS[serviceName]
  if (!port) throw new Error(`Unknown service: ${serviceName}`)
  return `http://${getServiceHost(serviceName)}:${port}`
}

export const GATEWAY_SERVICES = SERVICE_NAMES.map((name) => [name, SERVICE_PORTS[name]])
