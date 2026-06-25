import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getVerificationGuidance,
  loginWithRole,
  parseAuthError,
  signUpWithRole,
} from '../lib/authService'
import { insforge, insforgeConfigHint, isInsforgeConfigured } from '../lib/insforgeClient'
import Card from './ui/Card'
import Input from './ui/Input'
import Button from './ui/Button'

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
        toggleActive: 'bg-teal-100 text-teal-600',
        toggleIdle: 'text-slate-500 hover:text-teal-600',
        alert: 'border-teal-100 bg-teal-50 text-teal-600',
      }
    }

    return {
      toggleActive: 'bg-sky-100 text-sky-600',
      toggleIdle: 'text-slate-500 hover:text-sky-600',
      alert: 'border-sky-100 bg-sky-50 text-sky-600',
    }
  }, [accent])

  const fieldAccent = accent === 'teal' ? 'teal' : 'sky'

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
    <Card as="section" padding="lg" aria-live="polite">
      <div className="mb-6 inline-flex rounded-control bg-slate-50 p-1">
        <button
          type="button"
          className={`rounded-control px-4 py-2 text-[13px] font-bold transition ${isLogin ? theme.toggleActive : theme.toggleIdle}`}
          onClick={() => toggleMode(true)}
        >
          Login
        </button>
        <button
          type="button"
          className={`rounded-control px-4 py-2 text-[13px] font-bold transition ${!isLogin ? theme.toggleActive : theme.toggleIdle}`}
          onClick={() => toggleMode(false)}
        >
          Sign Up
        </button>
      </div>

      {errorMessage && (
        <p className="mb-4 rounded-control border border-danger-100 bg-danger-100 px-4 py-3 text-[13px] font-medium text-danger-700">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className={`mb-4 rounded-control border px-4 py-3 text-[13px] font-medium ${theme.alert}`}>
          {successMessage}
        </p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {!isLogin && (
          <Input
            label="Name"
            accent={fieldAccent}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            required
          />
        )}

        <Input
          label="Email"
          accent={fieldAccent}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          accent={fieldAccent}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
        />

        {!isLogin && (
          <Input
            label="Confirm Password"
            accent={fieldAccent}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />
        )}

        <Button
          type="submit"
          accent={fieldAccent}
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          {loading ? 'Please wait...' : isLogin ? `Login as ${role}` : `Create ${role} account`}
        </Button>
      </form>

      <p className="mt-4 text-[13px] text-slate-500">
        By continuing, you agree to use this platform responsibly in partnership with your care team.
      </p>

      {!isInsforgeConfigured && (
        <p className="mt-3 text-xs text-slate-500">{insforgeConfigHint}</p>
      )}

      <div className="mt-5 text-[13px]">
        <Link
          to="/"
          className="font-medium text-slate-600 underline-offset-2 transition hover:text-slate-800 hover:underline"
        >
          Return to portal selection
        </Link>
      </div>
    </Card>
  )
}
