import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_EXPIRES_IN, JWT_SECRET } from './config.js'
import { query } from './db.js'

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.profile?.role || user.role,
      name: user.profile?.name || user.display_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  )
}

export function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export async function findAuthUserByEmail(email) {
  const { rows } = await query('SELECT * FROM public.auth_users WHERE lower(email) = lower($1) LIMIT 1', [
    email,
  ])
  return rows[0] || null
}

export async function findAuthUserById(id) {
  const { rows } = await query('SELECT * FROM public.auth_users WHERE id = $1 LIMIT 1', [id])
  return rows[0] || null
}

export async function createAuthUser({ email, password }) {
  const passwordHash = await hashPassword(password)
  const { rows } = await query(
    `INSERT INTO public.auth_users (email, password_hash, email_verified)
     VALUES ($1, $2, TRUE)
     RETURNING id, email, email_verified, created_at`,
    [email, passwordHash],
  )
  return rows[0]
}

export async function getUserProfile(authUserId) {
  const { rows } = await query(
    `SELECT p.id, p.auth_user_id, p.email, p.role, p.display_name, p.created_at, p.updated_at
     FROM public.profiles p WHERE p.auth_user_id = $1 LIMIT 1`,
    [authUserId],
  )
  return rows[0] || null
}

export function buildAuthUserResponse(authUser, profile) {
  const displayName = profile?.display_name || authUser.email?.split('@')[0] || 'User'
  return {
    id: authUser.id,
    email: authUser.email,
    profile: {
      role: profile?.role || null,
      name: displayName,
      email: authUser.email,
    },
  }
}

export function existingAccountErrorMessage(profile) {
  if (profile?.role === 'youth') {
    return 'This email is already registered as a youth account. Please use the Youth portal to log in.'
  }
  if (profile?.role === 'staff') {
    return 'This email is already registered as a staff account. Please log in at the Staff portal.'
  }
  return 'An account with this email already exists.'
}
