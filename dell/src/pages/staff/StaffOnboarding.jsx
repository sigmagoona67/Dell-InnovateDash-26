import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import BasicInfoStep, { isBasicInfoComplete } from '../../components/onboarding/BasicInfoStep'
import ChallengesStep, { hasMinSelection as hasChallengeSelection } from '../../components/onboarding/ChallengesStep'
import InterestsStep, { hasMinSelection as hasInterestSelection } from '../../components/onboarding/InterestsStep'
import { OnboardingShell } from '../../components/onboarding/OnboardingShell'
import QualitiesStep, { hasMinSelection as hasQualitySelection } from '../../components/onboarding/QualitiesStep'
import { useStaffSession } from '../../context/StaffSessionContext'
import { STAFF_QUALITIES } from '../../lib/onboardingData'
import { staffQuestionnaireToOnboardingAnswers } from '../../lib/onboardingRequirements'
import { completeStaffOnboarding } from '../../services/staffQuestionnaireService'

const TOTAL_STEPS = 4

const STEP_CONFIG = [
  {
    heading: 'Basic Information',
    subtitle: 'Tell us a little about yourself so we can better understand your background and preferences.',
  },
  {
    heading: 'Support Style',
    subtitle: 'Which best describes your support style?',
    instruction: 'Select up to 5 qualities that best describe how you usually support young people.',
  },
  {
    heading: 'Interests',
    subtitle: 'Select topics that you enjoy discussing or connecting with youths through.',
    instruction: 'Choose up to 6 topics from different categories.',
  },
  {
    heading: 'Areas of Expertise',
    subtitle: 'Select up to 4 areas where you have experience or confidence supporting youths.',
    note: 'You can update these selections anytime.',
  },
]

function isStepValid(step, answers) {
  switch (step) {
    case 0:
      return isBasicInfoComplete(answers.basic)
    case 1:
      return hasQualitySelection(answers.communication)
    case 2:
      return hasInterestSelection(answers.interests)
    case 3:
      return hasChallengeSelection(answers.challenges)
    default:
      return false
  }
}

export default function StaffOnboarding() {
  const { context, refresh } = useStaffSession()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({
    basic: { languages: [] },
    communication: [],
    interests: [],
    challenges: [],
  })
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const prefilled = staffQuestionnaireToOnboardingAnswers(context?.questionnaire)
    if (prefilled) setAnswers(prefilled)
  }, [context?.questionnaire])

  if (context?.onboardingComplete) {
    return <Navigate to="/staff-dashboard" replace />
  }

  const config = STEP_CONFIG[step]
  const isLast = step === TOTAL_STEPS - 1
  const canProceed = isStepValid(step, answers)

  async function handleNext() {
    if (!canProceed) return

    if (!isLast) {
      setStep((prev) => prev + 1)
      return
    }

    setLoading(true)
    setErrorMessage('')
    try {
      const payload = {
        dateOfBirth: answers.basic.dateOfBirth,
        gender: answers.basic.gender,
        country: answers.basic.country,
        languages: answers.basic.languages,
        communication: answers.communication,
        interests: answers.interests,
        challenges: answers.challenges,
      }

      await completeStaffOnboarding(context.staffProfile.id, payload)
      await refresh()
      navigate('/staff-dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save questionnaire. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handlePrevious() {
    if (step > 0) setStep((prev) => prev - 1)
  }

  return (
    <>
      {errorMessage && (
        <div className="fixed left-0 right-0 top-4 z-50 mx-auto max-w-xl px-6">
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        </div>
      )}

      <OnboardingShell
        badge="CareBridge AI · Staff onboarding"
        step={step}
        totalSteps={TOTAL_STEPS}
        heading={config.heading}
        subtitle={
          context?.questionnaire && !context?.onboardingComplete
            ? 'We have updated our profile questions. Please review your answers and submit.'
            : config.subtitle
        }
        instruction={config.instruction}
        note={config.note}
        onPrevious={handlePrevious}
        onNext={handleNext}
        nextLabel={isLast ? 'Submit' : 'Next >'}
        nextDisabled={!canProceed}
        loading={loading}
      >
        {step === 0 && (
          <BasicInfoStep
            form={answers.basic}
            onChange={(basic) => setAnswers({ ...answers, basic })}
          />
        )}
        {step === 1 && (
          <QualitiesStep
            options={STAFF_QUALITIES}
            selected={answers.communication}
            max={5}
            onChange={(communication) => setAnswers({ ...answers, communication })}
          />
        )}
        {step === 2 && (
          <InterestsStep
            selected={answers.interests}
            max={6}
            onChange={(interests) => setAnswers({ ...answers, interests })}
          />
        )}
        {step === 3 && (
          <ChallengesStep
            selected={answers.challenges}
            max={4}
            onChange={(challenges) => setAnswers({ ...answers, challenges })}
          />
        )}
      </OnboardingShell>
    </>
  )
}
