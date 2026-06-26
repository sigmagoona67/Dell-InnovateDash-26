import { verifyToken } from './auth.js'
import { SERVICE_API_KEY } from './config.js'

function isValidServiceKey(value) {
  return Boolean(value && SERVICE_API_KEY && value === SERVICE_API_KEY)
}

export function authMiddleware(req, res, next) {
  const serviceHeader = req.headers['x-service-key']
  if (isValidServiceKey(serviceHeader)) {
    req.serviceAuth = true
    req.user = null
    return next()
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token && isValidServiceKey(token)) {
    req.serviceAuth = true
    req.user = null
    return next()
  }
  if (!token) {
    req.user = null
    return next()
  }
  try {
    const payload = verifyToken(token)
    if (payload.type === 'refresh') {
      req.user = null
      return next()
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    }
    req.accessToken = token
    return next()
  } catch {
    // Stale Bearer tokens must not block public auth routes (signup/signin).
    req.user = null
    return next()
  }
}

export function requireAuth(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

export function requireStaff(req, res, next) {
  if (req.user?.role !== 'staff') {
    return res.status(403).json({ error: 'Staff access required.' })
  }
  return next()
}

export function requireYouth(req, res, next) {
  if (req.user?.role !== 'youth') {
    return res.status(403).json({ error: 'Youth access required.' })
  }
  return next()
}
