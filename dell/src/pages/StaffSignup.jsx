import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import {
  getVerificationGuidance,
  parseAuthError,
  signUpStaff,
} from '../lib/authService'
import { insforge, insforgeConfigHint, isInsforgeConfigured } from '../lib/insforgeClient'

const MIN_PASSWORD_LENGTH = 8

export default function StaffSignup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
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
    setSuccessMessage('')

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
      const result = await signUpStaff(insforge, {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        accessCode: accessCode.trim(),
      })

      if (result.kind === 'session') {
        setSuccessMessage('Account created successfully. Redirecting...')
        navigate('/staff-dashboard', { replace: true })
        return
      }

      if (result.kind === 'verification-enabled') {
        setSuccessMessage(
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
        setSuccessMessage(verificationGuidance)
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
      title="Create a staff account"
      subtitle="Sign up with your organization access code. You'll complete a short staff profile questionnaire before reaching the dashboard."
      accent="sky"
    >
      <Card as="section" padding="lg" aria-live="polite">
        {errorMessage && (
          <p className="mb-4 rounded-control border border-danger-100 bg-danger-100 px-4 py-3 text-[13px] font-medium text-danger-700">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="mb-4 rounded-control border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] font-medium text-sky-600">
            {successMessage}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Full Name"
            accent="sky"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            required
          />

          <Input
            label="Email"
            accent="sky"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            accent="sky"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirm Password"
            accent="sky"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />

          <Input
            label="Staff Access Code"
            hint="Issued by your organization. Required to create a staff account."
            accent="sky"
            type="password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="Enter your staff access code"
            autoComplete="off"
            required
          />

          <Button
            type="submit"
            accent="sky"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            {loading ? 'Creating account...' : 'Create staff account'}
          </Button>
        </form>

        <p className="mt-4 text-[13px] text-slate-500">
          Already have a staff account?{' '}
          <Link
            to="/staff-auth"
            className="font-medium text-sky-600 underline-offset-2 transition hover:text-sky-700 hover:underline"
          >
            Log in here
          </Link>
        </p>

        {!isInsforgeConfigured && (
          <p className="mt-3 text-xs text-slate-500">{insforgeConfigHint}</p>
        )}
      </Card>
    </PageShell>
  )
}
