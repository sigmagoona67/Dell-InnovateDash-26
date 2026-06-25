import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AiTagPicker from '../../components/youth/AiTagPicker'
import PersonalityScales from '../../components/youth/PersonalityScales'
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
        <textarea
          value={answers[section.id] || ''}
          onChange={(event) => setSectionAnswer(event.target.value)}
          rows={8}
          placeholder="Share anything that helps us match you with the right youth…"
          className="w-full flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"
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
      <div className="flex min-h-dvh items-center justify-center bg-white px-6">
        <p className="text-slate-600">Loading your profile quiz…</p>
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
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-4 py-1.5 text-sm font-medium text-sky-600">
              CareBridge AI · Staff Profile Quiz
            </p>
            {quizCompleted && (
              <Link
                to="/staff-dashboard"
                className="text-sm font-medium text-sky-600 hover:text-sky-700"
              >
                Back to dashboard
              </Link>
            )}
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-pill bg-slate-100">
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
          <p
            role="alert"
            className="mb-4 rounded-card border border-danger-100 bg-danger-100/50 px-4 py-3 text-[13px] text-danger-700"
          >
            {errorMessage}
          </p>
        )}

        <section className="flex flex-1 flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_36px_-14px_rgba(45,90,110,0.12)] sm:p-8">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            {section.title}
          </h1>
          <p className="mb-8 text-slate-600">{section.subtitle}</p>

          {renderSectionInput()}

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
              className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:opacity-70"
            >
              {loading ? 'Saving...' : isLast ? (isEditing ? 'Save changes' : 'Complete quiz') : 'Next >'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
