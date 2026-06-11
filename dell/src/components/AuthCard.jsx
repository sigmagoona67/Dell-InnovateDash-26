import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getVerificationGuidance,
  loginWithRole,
  parseAuthError,
  signUpWithRole,
} from '../lib/authService'
import { insforge, insforgeConfigHint, isInsforgeConfigured } from '../lib/insforgeClient'

const MIN_PASSWORD_LENGTH = 8

export default function AuthCard({ role, accent, loginDestination }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const theme = useMemo(() => {
    if (accent === 'teal') {
      return {
        ring: 'focus-visible:ring-teal-400',
        border: 'border-teal-100',
        button: 'bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-400',
        toggleActive: 'bg-teal-100 text-teal-700',
        toggleIdle: 'text-slate-500 hover:text-teal-700',
        alert: 'border-teal-200 bg-teal-50 text-teal-700',
      }
    }

    return {
      ring: 'focus-visible:ring-sky-400',
      border: 'border-sky-100',
      button: 'bg-sky-500 hover:bg-sky-600 focus-visible:ring-sky-400',
      toggleActive: 'bg-sky-100 text-sky-700',
      toggleIdle: 'text-slate-500 hover:text-sky-700',
      alert: 'border-sky-200 bg-sky-50 text-sky-700',
    }
  }, [accent])

  function resetMessages() {
    setErrorMessage('')
    setSuccessMessage('')
  }

  function toggleMode(nextIsLogin) {
    setIsLogin(nextIsLogin)
    resetMessages()
  }

  function validateForm() {
    if (!isLogin && !name.trim()) {
      return 'Name is required.'
    }

    if (!email || !password) {
      return 'Email and password are required.'
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return 'Please enter a valid email address.'
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }

    if (!isLogin && password !== confirmPassword) {
      return 'Passwords do not match.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    resetMessages()

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    if (!isInsforgeConfigured || !insforge) {
      setErrorMessage('Missing environment variables: VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY.')
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        await loginWithRole(insforge, { email, password, role })
        setSuccessMessage('Login successful. Redirecting...')
        navigate(loginDestination, { replace: true })
        return
      }

      const result = await signUpWithRole(insforge, { email, password, role, name: name.trim() })

      if (result.kind === 'session') {
        setSuccessMessage('Account created successfully. Redirecting...')
        navigate(loginDestination, { replace: true })
        return
      }

      if (result.kind === 'verification-enabled') {
        setSuccessMessage(`Account created. ${result.hint}`)
        setIsLogin(true)
        setConfirmPassword('')
        return
      }

      setSuccessMessage('Account created successfully. You can log in now.')
      setIsLogin(true)
      setConfirmPassword('')
    } catch (error) {
      const verificationGuidance = getVerificationGuidance(error)
      if (verificationGuidance) {
        setSuccessMessage(verificationGuidance)
        return
      }

      const parsed = parseAuthError(error)
      setErrorMessage(parsed || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className={`rounded-3xl border ${theme.border} bg-white p-6 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.2)] sm:p-8`}
      aria-live="polite"
    >
      <div className="mb-6 inline-flex rounded-2xl bg-slate-50 p-1">
        <button
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${isLogin ? theme.toggleActive : theme.toggleIdle}`}
          onClick={() => toggleMode(true)}
        >
          Login
        </button>
        <button
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${!isLogin ? theme.toggleActive : theme.toggleIdle}`}
          onClick={() => toggleMode(false)}
        >
          Sign Up
        </button>
      </div>

      {errorMessage && (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${theme.alert}`}>
          {successMessage}
        </p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {!isLogin && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 ${theme.ring}`}
              placeholder="Your full name"
              autoComplete="name"
              required
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 ${theme.ring}`}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 ${theme.ring}`}
            placeholder="At least 8 characters"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
        </label>

        {!isLogin && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 ${theme.ring}`}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-2xl px-6 py-3.5 text-base font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${theme.button}`}
        >
          {loading ? 'Please wait...' : isLogin ? `Login as ${role}` : `Create ${role} account`}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        By continuing, you agree to use this platform responsibly in partnership with your care team.
      </p>

      {!isInsforgeConfigured && (
        <p className="mt-3 text-xs text-slate-500">{insforgeConfigHint}</p>
      )}

      <div className="mt-5 text-sm">
        <Link
          to="/"
          className="font-medium text-slate-600 underline-offset-2 transition hover:text-slate-800 hover:underline"
        >
          Return to portal selection
        </Link>
      </div>
    </section>
  )
}
