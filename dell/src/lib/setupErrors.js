import { apiConfigHint, isApiConfigured } from './insforgeClient'

export const SETUP_ERROR = {
  ENV: 'env',
  SCHEMA: 'schema',
  AUTH: 'auth',
  NETWORK: 'network',
  UNKNOWN: 'unknown',
}

function errorText(error) {
  if (!error) return ''
  return [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function classifySetupError(error) {
  if (!isApiConfigured) {
    return {
      type: SETUP_ERROR.ENV,
      title: 'API not configured',
      message: apiConfigHint,
      details: 'Set VITE_API_URL (default http://localhost:3001) in .env.local or runtime config.js.',
    }
  }

  const text = errorText(error)

  if (
    text.includes('not authenticated') ||
    text.includes('role mismatch') ||
    text.includes('session expired') ||
    text.includes('invalid login') ||
    text.includes('jwt expired') ||
    text.includes('invalid jwt') ||
    text.includes('token expired')
  ) {
    return {
      type: SETUP_ERROR.AUTH,
      title: 'Sign in required',
      message: error?.message || 'Please sign in to continue.',
      details: null,
    }
  }

  if (
    text.includes('relation') ||
    text.includes('does not exist') ||
    text.includes('42p01') ||
    text.includes('profiles') ||
    text.includes('schema cache') ||
    text.includes('could not find the table')
  ) {
    return {
      type: SETUP_ERROR.SCHEMA,
      title: 'Database setup incomplete',
      message: 'CareBridge database tables are not applied yet.',
      details:
        'Run backend/scripts/init-db.mjs or kubectl apply the carebridge-db-init job, then retry.',
    }
  }

  if (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('failed to fetch') ||
    text.includes('network_error') ||
    text.includes('request timeout') ||
    text.includes('backend service is unavailable')
  ) {
    return {
      type: SETUP_ERROR.NETWORK,
      title: 'Cannot reach API',
      message: error?.message || 'The backend could not be reached.',
      details: 'Check VITE_API_URL, port-forward the gateway (3001), or run docker compose up.',
    }
  }

  return {
    type: SETUP_ERROR.UNKNOWN,
    title: 'Something went wrong',
    message: error?.message || 'An unexpected error occurred.',
    details: 'Check the browser console for details, then retry.',
  }
}

export function isAuthSetupError(classified) {
  return classified?.type === SETUP_ERROR.AUTH
}

export function isBlockingSetupError(classified) {
  return (
    classified?.type === SETUP_ERROR.ENV ||
    classified?.type === SETUP_ERROR.SCHEMA ||
    classified?.type === SETUP_ERROR.NETWORK
  )
}
