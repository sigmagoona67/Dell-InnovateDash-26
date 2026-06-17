import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AmbientBackground from '../../components/AmbientBackground'
import { useYouthSession } from '../../context/YouthSessionContext'
import { ONBOARDING_SECTIONS } from '../../lib/youthMockData'
import { completeOnboarding } from '../../services/questionnaireService'

function OptionChip({ label, selected, onToggle, type = 'multiple' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2
        ${selected
          ? 'border-teal-400 bg-teal-50 text-teal-700 shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50'}
      `}
      aria-pressed={selected}
    >
      <span className="mr-2 inline-block w-4">
        {type === 'single' ? (selected ? '●' : '○') : selected ? '☑' : '☐'}
      </span>
      {label}
    </button>
  )
}

export default function YouthOnboarding() {
  const { context, refresh } = useYouthSession()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  if (context?.youth?.onboarding_completed) {
    return <Navigate to="/youth-chat/portal" replace />
  }

  const section = ONBOARDING_SECTIONS[step]
  const isFirst = step === 0
  const isLast = step === ONBOARDING_SECTIONS.length - 1

  const progress = useMemo(
    () => Math.round(((step + 1) / ONBOARDING_SECTIONS.length) * 100),
    [step],
  )

  function toggleMultiple(option) {
    const current = answers[section.id] || []
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option]
    setAnswers({ ...answers, [section.id]: next })
  }

  function selectSingle(option) {
    setAnswers({ ...answers, [section.id]: option })
  }

  function setNotes(value) {
    setAnswers({ ...answers, [section.id]: value })
  }

  async function handleNext() {
    if (!isLast) {
      setStep((prev) => prev + 1)
      return
    }

    setLoading(true)
    setErrorMessage('')
    try {
      await completeOnboarding(context.youth.id, answers, {
        preferredName: context.displayName || context.youth.preferred_name,
      })
      await refresh()
      navigate('/youth-chat/portal', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save questionnaire. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handlePrevious() {
    if (!isFirst) setStep((prev) => prev - 1)
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-white">
      <AmbientBackground variant="teal" />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:px-8">
        <header className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50/80 px-4 py-1.5 text-sm font-medium text-teal-600">
            CareBridge AI · Getting to know you
          </p>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-sky-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500">
            Step {step + 1} of {ONBOARDING_SECTIONS.length}
          </p>
        </header>

        {errorMessage && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        <section className="flex flex-1 flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)] sm:p-8">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            {section.title}
          </h1>
          <p className="mb-8 text-slate-600">{section.subtitle}</p>

          {section.type === 'textarea' ? (
            <textarea
              value={answers[section.id] || ''}
              onChange={(event) => setNotes(event.target.value)}
              rows={8}
              placeholder="Share anything that would help us support you better..."
              className="w-full flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-400"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {section.options.map((option) => (
                <OptionChip
                  key={option}
                  label={option}
                  type={section.type}
                  selected={
                    section.type === 'single'
                      ? answers[section.id] === option
                      : (answers[section.id] || []).includes(option)
                  }
                  onToggle={() =>
                    section.type === 'single' ? selectSingle(option) : toggleMultiple(option)
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-10 flex items-center justify-end gap-3">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={loading}
                className="rounded-2xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                &lt; Previous
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="rounded-2xl bg-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 disabled:opacity-70"
            >
              {loading ? 'Saving...' : isLast ? 'Submit' : 'Next >'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
