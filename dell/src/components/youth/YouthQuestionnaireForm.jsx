import { useEffect, useState } from 'react'
import BasicInfoStep, { isBasicInfoComplete } from '../onboarding/BasicInfoStep'
import ChallengesStep, { hasMinSelection as hasChallengeSelection } from '../onboarding/ChallengesStep'
import InterestsStep, { hasMinSelection as hasInterestSelection } from '../onboarding/InterestsStep'
import { OnboardingShell } from '../onboarding/OnboardingShell'
import QualitiesStep, { hasMinSelection as hasQualitySelection } from '../onboarding/QualitiesStep'
import { YOUTH_QUALITIES } from '../../lib/onboardingData'
import { YOUTH_PROFILE_LABELS } from '../../lib/profileLabels'
import { youthQuestionnaireToOnboardingAnswers } from '../../lib/onboardingRequirements'
import { saveQuestionnaire } from '../../services/questionnaireService'

export const YOUTH_QUESTIONNAIRE_STEPS = [
  {
    heading: 'Basic Information',
    subtitle: 'Tell us a little about yourself so we can better understand your background and preferences.',
  },
  {
    heading: YOUTH_PROFILE_LABELS.communicationTitle,
    subtitle: 'How do you feel most comfortable being supported?',
    instruction: 'Select up to 5 qualities that would help you feel safe and comfortable talking to your youth worker.',
  },
  {
    heading: 'Interests',
    subtitle: 'Select topics you enjoy or feel comfortable talking about.',
    instruction: 'Choose up to 6 topics from different categories.',
  },
  {
    heading: YOUTH_PROFILE_LABELS.challengesTitle,
    subtitle: 'Select up to 4 areas where you would like support.',
    note: 'You can update these selections anytime.',
  },
]

export const YOUTH_QUESTIONNAIRE_TOTAL_STEPS = YOUTH_QUESTIONNAIRE_STEPS.length

function isStepValid(step, answers) {
  switch (step) {
    case 0:
      return isBasicInfoComplete(answers.basic, { requireWorkerPrefs: true })
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

export function buildYouthQuestionnairePayload(answers) {
  return {
    dateOfBirth: answers.basic.dateOfBirth,
    gender: answers.basic.gender,
    country: answers.basic.country,
    languages: answers.basic.languages,
    preferredWorkerGender: answers.basic.preferredWorkerGender,
    preferredWorkerAgeRange: answers.basic.preferredWorkerAgeRange,
    communication: answers.communication,
    interests: answers.interests,
    challenges: answers.challenges,
  }
}

export default function YouthQuestionnaireForm({
  questionnaire,
  youthId,
  embedded = false,
  badge = 'CareBridge AI · Getting to know you',
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
    const prefilled = youthQuestionnaireToOnboardingAnswers(questionnaire)
    if (prefilled) {
      setAnswers(prefilled)
    }
  }, [questionnaire])

  const config = YOUTH_QUESTIONNAIRE_STEPS[step]
  const isLast = step === YOUTH_QUESTIONNAIRE_TOTAL_STEPS - 1
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
      const payload = buildYouthQuestionnairePayload(answers)
      const data = onSubmit ? await onSubmit(payload) : await saveQuestionnaire(youthId, payload)
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
        totalSteps={YOUTH_QUESTIONNAIRE_TOTAL_STEPS}
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
            showWorkerPrefs
          />
        )}
        {step === 1 && (
          <QualitiesStep
            options={YOUTH_QUALITIES}
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
