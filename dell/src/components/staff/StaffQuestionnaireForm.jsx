import { useEffect, useState } from 'react'
import BasicInfoStep, { isBasicInfoComplete } from '../onboarding/BasicInfoStep'
import ChallengesStep, { hasMinSelection as hasChallengeSelection } from '../onboarding/ChallengesStep'
import InterestsStep, { hasMinSelection as hasInterestSelection } from '../onboarding/InterestsStep'
import { OnboardingShell } from '../onboarding/OnboardingShell'
import QualitiesStep, { hasMinSelection as hasQualitySelection } from '../onboarding/QualitiesStep'
import { STAFF_QUALITIES } from '../../lib/onboardingData'
import { STAFF_MIN_AGE } from '../../lib/profileLabels'
import { staffQuestionnaireToOnboardingAnswers } from '../../lib/onboardingRequirements'
import { saveStaffQuestionnaire } from '../../services/staffQuestionnaireService'

export const STAFF_QUESTIONNAIRE_STEPS = [
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
    heading: 'Areas of Support',
    subtitle: 'Select up to 4 areas where you feel confident supporting youths.',
    note: 'You can update these selections anytime.',
  },
]

export const STAFF_QUESTIONNAIRE_TOTAL_STEPS = STAFF_QUESTIONNAIRE_STEPS.length

function isStepValid(step, answers) {
  switch (step) {
    case 0:
      return isBasicInfoComplete(answers.basic, { minAge: STAFF_MIN_AGE })
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

export function buildStaffQuestionnairePayload(answers) {
  return {
    dateOfBirth: answers.basic.dateOfBirth,
    gender: answers.basic.gender,
    country: answers.basic.country,
    languages: answers.basic.languages,
    communication: answers.communication,
    interests: answers.interests,
    challenges: answers.challenges,
  }
}

export default function StaffQuestionnaireForm({
  questionnaire,
  staffProfileId,
  embedded = false,
  badge = 'CareBridge AI · Staff onboarding',
  submitLabel = 'Submit',
  reviewSubtitle = null,
  onSubmit,
  onSaved,
}) {
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
    const prefilled = staffQuestionnaireToOnboardingAnswers(questionnaire)
    if (prefilled) {
      setAnswers(prefilled)
    }
  }, [questionnaire])

  const config = STAFF_QUESTIONNAIRE_STEPS[step]
  const isLast = step === STAFF_QUESTIONNAIRE_TOTAL_STEPS - 1
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
      const payload = buildStaffQuestionnairePayload(answers)
      const data = onSubmit
        ? await onSubmit(payload)
        : await saveStaffQuestionnaire(staffProfileId, payload)
      await onSaved?.(data)
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
        <div className={`${embedded ? 'mb-4' : 'fixed left-0 right-0 top-4 z-50 mx-auto max-w-xl px-6'}`}>
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        </div>
      )}

      <OnboardingShell
        embedded={embedded}
        badge={badge}
        step={step}
        totalSteps={STAFF_QUESTIONNAIRE_TOTAL_STEPS}
        heading={config.heading}
        subtitle={reviewSubtitle || config.subtitle}
        instruction={config.instruction}
        note={config.note}
        onPrevious={handlePrevious}
        onNext={handleNext}
        nextLabel={isLast ? submitLabel : 'Next >'}
        nextDisabled={!canProceed}
        loading={loading}
      >
        {step === 0 && (
          <BasicInfoStep
            form={answers.basic}
            onChange={(basic) => setAnswers({ ...answers, basic })}
            minAge={STAFF_MIN_AGE}
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
