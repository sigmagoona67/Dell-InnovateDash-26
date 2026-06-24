import { insforgeConfigHint, isInsforgeConfigured } from './insforgeClient'

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
  if (!isInsforgeConfigured) {
    return {
      type: SETUP_ERROR.ENV,
      title: 'InsForge environment not configured',
      message: insforgeConfigHint,
      details:
        'Add VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY to .env.local, then restart npm run dev.',
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
    text.includes('pgrst') ||
    text.includes('profiles') ||
    text.includes('schema cache') ||
    text.includes('could not find the table')
  ) {
    return {
      type: SETUP_ERROR.SCHEMA,
      title: 'Database setup incomplete',
      message: 'CareBridge database tables or policies are not applied yet.',
      details:
        'Open InsForge → Database → Database Studio → SQL Editor and run the youth schema script first, then the staff schema script from the migrations/ folder.',
    }
  }

  if (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('failed to fetch') ||
    text.includes('network_error') ||
    text.includes('request timeout')
  ) {
    return {
      type: SETUP_ERROR.NETWORK,
      title: 'Cannot reach InsForge',
      message: error?.message || 'The backend could not be reached.',
      details: 'Check VITE_INSFORGE_URL, your network connection, and that the InsForge project is online.',
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
