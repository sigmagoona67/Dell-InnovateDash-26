import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import SetupErrorPage from '../components/SetupErrorPage'
import {
  classifySetupError,
  isAuthSetupError,
  isBlockingSetupError,
} from '../lib/setupErrors'
import { bootstrapYouthSession } from '../services/youthService'

const YouthSessionContext = createContext(null)

export function YouthSessionProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    setupError: null,
    context: null,
  })

  async function refresh() {
    setState((prev) => ({ ...prev, loading: true, error: null, setupError: null }))
    try {
      const context = await bootstrapYouthSession('session-refresh')
      setState({ loading: false, error: null, setupError: null, context })
    } catch (error) {
      console.error('[youth-auth] session refresh failed:', error)
      const classified = classifySetupError(error)
      setState({
        loading: false,
        error,
        setupError: classified,
        context: null,
      })
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      refresh,
    }),
    [state],
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

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-dvh items-center justify-center bg-white px-6"
      >
        <p className="text-[15px] text-slate-600">Getting your space ready…</p>
      </div>
    )
  }

  if (setupError && isBlockingSetupError(setupError)) {
    return <SetupErrorPage classified={setupError} onRetry={refresh} />
  }

  if ((error || !context) && (!setupError || isAuthSetupError(setupError))) {
    console.log('[youth-auth] auth gate redirect to /youth-auth:', error?.message)
    return <Navigate to="/youth-auth" replace state={{ from: location.pathname }} />
  }

  if (error || !context) {
    return <SetupErrorPage classified={setupError || classifySetupError(error)} onRetry={refresh} />
  }

  return children
}

export function YouthEntryRedirect() {
  const { context } = useYouthSession()
  const destination = context?.destination || (
    context?.youth?.onboarding_completed ? '/youth-chat/portal' : '/youth-chat/onboarding'
  )

  console.log('[youth-auth] entry redirect to:', destination)
  return <Navigate to={destination} replace />
}
