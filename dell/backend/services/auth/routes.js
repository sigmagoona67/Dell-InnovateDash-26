import { Router } from 'express'
import {
  buildAuthUserResponse,
  comparePassword,
  createAuthUser,
  existingAccountErrorMessage,
  findAuthUserByEmail,
  findAuthUserById,
  getUserProfile,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from '../../lib/auth.js'
import { query } from '../../lib/db.js'
import { requireAuth } from '../../lib/authMiddleware.js'

export const authRouter = Router()

authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' })

    const existing = await findAuthUserByEmail(email)
    if (existing) {
      const profile = await getUserProfile(existing.id)
      return res.status(409).json({ error: existingAccountErrorMessage(profile) })
    }

    const authUser = await createAuthUser({ email, password })
    const user = buildAuthUserResponse(authUser, null)
    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(authUser.id)

    return res.json({ accessToken, refreshToken, user, requireEmailVerification: false })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

authRouter.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const authUser = await findAuthUserByEmail(email)
    if (!authUser) return res.status(401).json({ error: 'Invalid login credentials' })

    const ok = await comparePassword(password, authUser.password_hash)
    if (!ok) return res.status(401).json({ error: 'Invalid login credentials' })

    const profile = await getUserProfile(authUser.id)
    const user = buildAuthUserResponse(authUser, profile)
    return res.json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(authUser.id),
      user,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

authRouter.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {}
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' })

    const payload = verifyToken(refreshToken)
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid refresh token' })

    const authUser = await findAuthUserById(payload.sub)
    if (!authUser) return res.status(401).json({ error: 'User not found' })

    const profile = await getUserProfile(authUser.id)
    const user = buildAuthUserResponse(authUser, profile)
    return res.json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(authUser.id),
      user,
    })
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const authUser = await findAuthUserById(req.user.id)
    const profile = await getUserProfile(req.user.id)
    return res.json({ user: buildAuthUserResponse(authUser, profile) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

authRouter.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { role, email, name } = req.body || {}
    const authUser = await findAuthUserById(req.user.id)
    let profile = await getUserProfile(req.user.id)

    if (!profile && role) {
      const { rows } = await query(
        `INSERT INTO public.profiles (auth_user_id, email, role, display_name)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.user.id, email || authUser.email, role, name || email?.split('@')[0] || 'User'],
      )
      profile = rows[0]
    } else if (profile) {
      if (role && profile.role && role !== profile.role) {
        return res.status(403).json({
          error: `Role mismatch. This account is registered as ${profile.role}. Please use the correct portal.`,
        })
      }

      const updates = []
      const vals = []
      let i = 1
      if (role && !profile.role) {
        updates.push(`role = $${i++}`)
        vals.push(role)
      }
      if (name) {
        updates.push(`display_name = $${i++}`)
        vals.push(name)
      }
      if (email) {
        updates.push(`email = $${i++}`)
        vals.push(email)
      }
      if (updates.length) {
        vals.push(profile.id)
        const { rows } = await query(
          `UPDATE public.profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
          vals,
        )
        profile = rows[0]
      }
    }

    const user = buildAuthUserResponse(authUser, profile)
    return res.json({ user, accessToken: signAccessToken(user) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})
