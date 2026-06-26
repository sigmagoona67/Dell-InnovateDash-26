import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const JWT_SECRET = process.env.JWT_SECRET || 'carebridge-dev-jwt-secret-change-in-production'
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://carebridge:carebridge@localhost:5432/carebridge'
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
export const OPENROUTER_CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o'
export const SERVICE_API_KEY = process.env.SERVICE_API_KEY || 'carebridge-service-key'
export const REDIS_URL = process.env.REDIS_URL || ''
export const BIND_HOST = process.env.BIND_HOST || '0.0.0.0'

export const SERVICE_PORTS = {
  gateway: Number(process.env.GATEWAY_PORT || 3001),
  auth: Number(process.env.AUTH_PORT || 3002),
  profile: Number(process.env.PROFILE_PORT || 3003),
  onboarding: Number(process.env.ONBOARDING_PORT || 3004),
  case: Number(process.env.CASE_PORT || 3005),
  reassignment: Number(process.env.REASSIGNMENT_PORT || 3006),
  team: Number(process.env.TEAM_PORT || 3007),
  'ai-chat': Number(process.env.AI_CHAT_PORT || 3008),
  'ai-insights': Number(process.env.AI_INSIGHTS_PORT || 3009),
  offline: Number(process.env.OFFLINE_PORT || 3010),
  'offline-summary': Number(process.env.OFFLINE_SUMMARY_PORT || 3011),
  scheduling: Number(process.env.SCHEDULING_PORT || 3012),
  'staff-edit': Number(process.env.STAFF_EDIT_PORT || 3013),
  storage: Number(process.env.STORAGE_PORT || 3014),
  notification: Number(process.env.NOTIFICATION_PORT || 3015),
}
