import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, Circle, Square } from 'lucide-react'
import { useYouthSession } from '../../context/YouthSessionContext'
import { ONBOARDING_SECTIONS } from '../../lib/youthMockData'
import { completeOnboarding } from '../../services/questionnaireService'
import AiTagPicker from '../../components/youth/AiTagPicker'
import PersonalityScales from '../../components/youth/PersonalityScales'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Textarea from '../../components/ui/Textarea'

function OptionChip({ label, selected, onToggle, type = 'multiple' }) {
  const Icon = type === 'single'
    ? (selected ? CheckCircle2 : Circle)
    : (selected ? CheckSquare : Square)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        inline-flex items-center gap-2 rounded-control border px-4 py-3 text-left text-sm font-medium transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2
        ${selected
          ? 'border-teal-500 bg-teal-50 text-teal-600'
          : 'border-slate-200 bg-white text-slate-800 hover:border-teal-100 hover:bg-teal-50'}
      `}
      aria-pressed={selected}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${selected ? '' : 'text-slate-400'}`}
        aria-hidden="true"
      />
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

  function setSectionAnswer(value) {
    setAnswers({ ...answers, [section.id]: value })
  }

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

  function renderSectionInput() {
    if (section.type === 'textarea') {
      return (
        <Textarea
          label={section.title}
          srLabel
          accent="teal"
          value={answers[section.id] || ''}
          onChange={(event) => setNotes(event.target.value)}
          rows={8}
          placeholder="Share anything that would help us support you better..."
          className="flex-1"
        />
      )
    }

    if (section.type === 'ai_tags') {
      return (
        <AiTagPicker
          key={section.id}
          category={section.aiCategory}
          placeholder={section.placeholder}
          hint={section.hint}
          value={answers[section.id] || []}
          onChange={setSectionAnswer}
        />
      )
    }

    if (section.type === 'scales') {
      return (
        <PersonalityScales
          value={answers[section.id] || []}
          onChange={setSectionAnswer}
        />
      )
    }

    return (
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
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-sky-50 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:px-8">
        <header className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-pill border border-teal-100 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-600">
            CareBridge AI · Getting to know you
          </p>
          <div
            className="mb-4 h-2 overflow-hidden rounded-pill bg-slate-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-pill bg-gradient-to-r from-teal-500 to-sky-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500">
            Step {step + 1} of {ONBOARDING_SECTIONS.length}
          </p>
        </header>

        {errorMessage && (
          <p role="alert" className="mb-4 rounded-control bg-danger-100 px-4 py-3 text-sm text-danger-700">
            {errorMessage}
          </p>
        )}

        <Card padding="lg" as="section" className="flex flex-1 flex-col">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-ink-800 sm:text-3xl">
            {section.title}
          </h1>
          <p className="mb-8 text-slate-600">{section.subtitle}</p>

          {renderSectionInput()}

          <div className="mt-10 flex items-center justify-end gap-3">
            {!isFirst && (
              <Button type="button" variant="ghost" accent="teal" onClick={handlePrevious} disabled={loading}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
            )}
            <Button type="button" accent="teal" onClick={handleNext} loading={loading}>
              {isLast ? 'Submit' : 'Next'}
              {!isLast && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
