import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import SetupErrorPage from '../components/SetupErrorPage'
import {
  classifySetupError,
  isAuthSetupError,
  isBlockingSetupError,
} from '../lib/setupErrors'
import { readYouthBootstrapCache } from '../lib/youthBootstrapCache'
import { bootstrapYouthSession } from '../services/youthService'

const YouthSessionContext = createContext(null)

function buildInitialYouthState() {
  const cached = readYouthBootstrapCache()
  if (cached) {
    return { loading: false, error: null, setupError: null, context: cached }
  }
  return { loading: true, error: null, setupError: null, context: null }
}

export function YouthSessionProvider({ children }) {
  const [state, setState] = useState(buildInitialYouthState)

  const refresh = useCallback(
    async ({ silent = false, revalidateOnboarding = false, revalidateAssignment = false } = {}) => {
      setState((prev) => {
        if (!silent || !prev.context) {
          return { ...prev, loading: true, error: null, setupError: null }
        }
        return prev
      })

      try {
        const context = await bootstrapYouthSession('session-refresh', {
          preferCache: silent,
          revalidateOnboarding: revalidateOnboarding || (!silent && !revalidateAssignment),
          revalidateAssignment,
        })

        setState({ loading: false, error: null, setupError: null, context })
      } catch (error) {
        console.error('[youth-auth] session refresh failed:', error)

        const classified = classifySetupError(error)
        const authFailure = isAuthSetupError(classified)
        const cachedBootstrap = readYouthBootstrapCache()

        setState((prev) => ({
          loading: false,
          error,
          setupError: authFailure && !(prev.context || cachedBootstrap) ? classified : null,
          context: prev.context || cachedBootstrap || null,
        }))
      }
    },
    [],
  )

  useEffect(() => {
    const hasCache = Boolean(readYouthBootstrapCache())
    refresh({ silent: hasCache })
  }, [refresh])

  const value = useMemo(
    () => ({
      ...state,
      refresh,
    }),
    [state, refresh],
  )

  return <YouthSessionContext.Provider value={value}>{children}</YouthSessionContext.Provider>
}

export function useYouthSession() {
  const context = useContext(YouthSessionContext)
  if (!context) throw new Error('useYouthSession must be used within YouthSessionProvider')
  return context
}

export function YouthAuthGate({ children }) {
  const { loading, error, setupError, context, refresh } = useYouthSession()
  const location = useLocation()

  if (loading && !context) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading your safe space...</p>
      </div>
    )
  }

  if (setupError && isBlockingSetupError(setupError)) {
    return <SetupErrorPage classified={setupError} onRetry={() => refresh()} />
  }

  if (!context && setupError && isAuthSetupError(setupError)) {
    console.log('[youth-auth] auth gate redirect to /youth-auth:', error?.message)
    return <Navigate to="/youth-auth" replace state={{ from: location.pathname + location.search }} />
  }

  if (!context) {
    const classified = setupError || classifySetupError(error)
    if (classified.message?.includes('Name is required') || classified.message?.includes('Not authenticated')) {
      return <Navigate to="/youth-auth" replace state={{ from: location.pathname + location.search }} />
    }
    return (
      <SetupErrorPage
        classified={classified}
        onRetry={() => refresh()}
      />
    )
  }

  return children
}

export function YouthEntryRedirect() {
  const { context } = useYouthSession()
  const destination =
    context?.destination ||
    (context?.onboardingComplete ? '/youth-chat/portal' : '/youth-chat/onboarding')

  console.log('[youth-auth] entry redirect to:', destination)
  return <Navigate to={destination} replace />
}
