import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import {
  getVerificationGuidance,
  parseAuthError,
  signUpStaff,
} from '../lib/authService'
import { getApiClient } from '../lib/insforgeClient'

const MIN_PASSWORD_LENGTH = 8

export default function StaffSignup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  function validateForm() {
    if (!fullName.trim()) {
      return 'Full name is required.'
    }

    if (!email.trim() || !password) {
      return 'Email and password are required.'
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email.trim())) {
      return 'Please enter a valid email address.'
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.'
    }

    if (!accessCode.trim()) {
      return 'Staff access code is required.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setLoading(true)

    try {
      const client = getApiClient()
      const result = await signUpStaff(client, {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        accessCode: accessCode.trim(),
      })

      if (result.kind === 'session') {
        navigate('/staff-dashboard/onboarding', { replace: true })
        return
      }

      if (result.kind === 'verification-enabled') {
        setErrorMessage(
          `Account created. Please verify your email, then log in to complete your staff questionnaire. ${result.hint}`,
        )
        return
      }

      navigate('/staff-auth', {
        replace: true,
        state: { message: 'Account created. Please log in to complete your staff questionnaire.' },
      })
    } catch (error) {
      if (error.message === 'Invalid staff access code.') {
        setErrorMessage('Invalid staff access code.')
        return
      }

      const verificationGuidance = getVerificationGuidance(error)
      if (verificationGuidance) {
        setErrorMessage(verificationGuidance)
        return
      }

      const parsed = parseAuthError(error)
      setErrorMessage(parsed || 'Unable to create staff account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      badge="CareBridge AI · Staff Portal"
      title="Staff Sign Up"
      subtitle="Create a staff account with your organization access code. You will complete a mandatory profile questionnaire before accessing the dashboard."
    >
      <section
        className="rounded-3xl border border-sky-100 bg-white p-6 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.2)] sm:p-8"
        aria-live="polite"
      >
        {errorMessage && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"
              placeholder="Your full name"
              autoComplete="name"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"
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
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Staff Access Code</span>
            <input
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"
              placeholder="Enter your staff access code"
              autoComplete="off"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-500 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Creating account...' : 'Create staff account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Already have a staff account?{' '}
          <Link
            to="/staff-auth"
            className="cursor-pointer font-medium text-sky-600 underline-offset-2 transition hover:underline"
          >
            Log in here
          </Link>
        </p>
      </section>
    </PageShell>
  )
}
