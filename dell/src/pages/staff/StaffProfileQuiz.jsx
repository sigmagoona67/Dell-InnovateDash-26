import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AiTagPicker from '../../components/youth/AiTagPicker'
import PersonalityScales from '../../components/youth/PersonalityScales'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Textarea from '../../components/ui/Textarea'
import Skeleton from '../../components/ui/Skeleton'
import { useStaffSession } from '../../context/StaffSessionContext'
import { STAFF_QUIZ_SECTIONS } from '../../lib/staffOnboardingConfig'
import { suggestStaffQuizOptions } from '../../services/staffQuizAiService'
import {
  getStaffQuestionnaire,
  saveStaffQuestionnaire,
} from '../../services/staffQuestionnaireService'

function mapQuestionnaireToAnswers(questionnaire) {
  if (!questionnaire) return {}
  return {
    interests: questionnaire.interests || [],
    personality: questionnaire.personality || [],
    communication: questionnaire.preferred_communication_style || [],
    strengths: questionnaire.supporting_strengths || [],
    notes: questionnaire.additional_notes || '',
  }
}

export default function StaffProfileQuiz() {
  const { context, refresh } = useStaffSession()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const staffId = context?.staffProfile?.id
  const quizCompleted = context?.staffQuestionnaire?.quiz_completed

  useEffect(() => {
    if (!staffId) return

    let cancelled = false

    async function loadExisting() {
      setLoadingInitial(true)
      try {
        const existing = await getStaffQuestionnaire(staffId)
        if (!cancelled) {
          setAnswers(mapQuestionnaireToAnswers(existing))
          setIsEditing(Boolean(existing?.quiz_completed))
        }
      } catch {
        if (!cancelled) setAnswers({})
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    }

    loadExisting()
    return () => {
      cancelled = true
    }
  }, [staffId])

  const section = STAFF_QUIZ_SECTIONS[step]
  const isFirst = step === 0
  const isLast = step === STAFF_QUIZ_SECTIONS.length - 1

  const progress = useMemo(
    () => Math.round(((step + 1) / STAFF_QUIZ_SECTIONS.length) * 100),
    [step],
  )

  function setSectionAnswer(value) {
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
      await saveStaffQuestionnaire(staffId, answers, { quizCompleted: true })
      await refresh()
      navigate('/staff-dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save profile quiz. Please try again.')
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
          accent="sky"
          value={answers[section.id] || ''}
          onChange={(event) => setSectionAnswer(event.target.value)}
          rows={8}
          placeholder="Share anything that helps us match you with the right youth…"
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
          fetchSuggestions={suggestStaffQuizOptions}
          accent="sky"
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

    return null
  }

  if (loadingInitial) {
    return (
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
        <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:px-8">
          <div role="status" aria-live="polite" className="flex flex-col gap-4">
            <span className="sr-only">Loading your profile quiz…</span>
            <Skeleton variant="line" className="w-48" />
            <Skeleton variant="line" className="h-2 w-full" />
            <Skeleton variant="block" className="h-72 w-full" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-teal-50 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:px-8">
        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 rounded-pill border border-sky-100 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-600">
              CareBridge AI · Staff Profile Quiz
            </p>
            {quizCompleted && (
              <Link
                to="/staff-dashboard"
                className="text-sm font-medium text-sky-600 hover:text-ink-800"
              >
                Back to dashboard
              </Link>
            )}
          </div>
          <div
            className="mb-4 h-2 overflow-hidden rounded-pill bg-slate-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-pill bg-sky-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500">
            Step {step + 1} of {STAFF_QUIZ_SECTIONS.length}
            {isEditing ? ' · Updating your profile' : ' · Complete this to unlock compatibility matching'}
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
              <Button type="button" variant="ghost" accent="sky" onClick={handlePrevious} disabled={loading}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
            )}
            <Button type="button" accent="sky" onClick={handleNext} loading={loading}>
              {isLast ? (isEditing ? 'Save changes' : 'Complete quiz') : 'Next'}
              {!isLast && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
