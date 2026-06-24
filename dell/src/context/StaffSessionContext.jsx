import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import SetupErrorPage from '../components/SetupErrorPage'
import {
  classifySetupError,
  isAuthSetupError,
  isBlockingSetupError,
} from '../lib/setupErrors'
import { readStaffBootstrapCache } from '../lib/staffBootstrapCache'
import { bootstrapStaffSession } from '../services/staffService'

const StaffSessionContext = createContext(null)

function buildInitialStaffState() {
  const cached = readStaffBootstrapCache()
  if (cached) {
    return { loading: false, error: null, setupError: null, context: cached }
  }
  return { loading: true, error: null, setupError: null, context: null }
}

export function StaffSessionProvider({ children }) {
  const [state, setState] = useState(buildInitialStaffState)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setState((prev) => ({ ...prev, loading: true, error: null, setupError: null }))
    }
    try {
      const context = await bootstrapStaffSession({ preferCache: silent })
      setState({ loading: false, error: null, setupError: null, context })
    } catch (error) {
      const classified = classifySetupError(error)
      const authFailure = isAuthSetupError(classified)
      setState((prev) => ({
        loading: false,
        error,
        setupError: classified,
        context: silent && prev.context && !authFailure ? prev.context : null,
      }))
    }
  }, [])

  useEffect(() => {
    const hasCache = Boolean(readStaffBootstrapCache())
    refresh({ silent: hasCache })
  }, [refresh])

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh])

  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>
}

export function useStaffSession() {
  const context = useContext(StaffSessionContext)
  if (!context) throw new Error('useStaffSession must be used within StaffSessionProvider')
  return context
}

export function StaffAuthGate({ children }) {
  const { loading, error, setupError, context, refresh } = useStaffSession()
  const location = useLocation()

  if (loading && !context) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading staff workspace...</p>
      </div>
    )
  }

  if (setupError && isBlockingSetupError(setupError)) {
    return <SetupErrorPage classified={setupError} onRetry={() => refresh()} />
  }

  if (!context && setupError && isAuthSetupError(setupError)) {
    return <Navigate to="/staff-auth" replace state={{ from: location.pathname }} />
  }

  if (!context) {
    return (
      <SetupErrorPage
        classified={setupError || classifySetupError(error)}
        onRetry={() => refresh()}
      />
    )
  }

  return children
}

export function StaffEntryRedirect() {
  const { context } = useStaffSession()
  const destination = context?.destination || (
    context?.onboardingComplete ? '/staff-dashboard' : '/staff-dashboard/onboarding'
  )

  return <Navigate to={destination} replace />
}
