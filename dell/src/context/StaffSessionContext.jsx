import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import SetupErrorPage from '../components/SetupErrorPage'
import {
  classifySetupError,
  isAuthSetupError,
  isBlockingSetupError,
} from '../lib/setupErrors'
import { bootstrapStaffSession } from '../services/staffService'

const StaffSessionContext = createContext(null)

export function StaffSessionProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    setupError: null,
    context: null,
  })

  async function refresh() {
    setState((prev) => ({ ...prev, loading: true, error: null, setupError: null }))
    try {
      const context = await bootstrapStaffSession()
      setState({ loading: false, error: null, setupError: null, context })
    } catch (error) {
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

  const value = useMemo(() => ({ ...state, refresh }), [state])

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

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading staff workspace...</p>
      </div>
    )
  }

  if (setupError && isBlockingSetupError(setupError)) {
    return <SetupErrorPage classified={setupError} onRetry={refresh} />
  }

  if ((error || !context) && (!setupError || isAuthSetupError(setupError))) {
    return <Navigate to="/staff-auth" replace state={{ from: location.pathname }} />
  }

  if (error || !context) {
    return <SetupErrorPage classified={setupError || classifySetupError(error)} onRetry={refresh} />
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
