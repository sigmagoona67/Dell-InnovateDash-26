import { calculateAgeFromDob } from '../../lib/onboardingData'
import { resolveStaffProfileAge } from '../../lib/onboardingRequirements'
import { YOUTH_PROFILE_LABELS } from '../../lib/profileLabels'

function ProfileInfoCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function InfoChip({ label, value }) {
  if (!value) return null
  return (
    <span className="rounded-2xl bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-200">
      {label}: {value}
    </span>
  )
}

function ChipSection({ title, items = [], emptyText = 'Not provided yet' }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-2xl bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-200"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">{emptyText}</span>
        )}
      </div>
    </section>
  )
}

export default function QuestionnaireProfileView({
  basicInfo,
  interests = [],
  communicationStyle = [],
  communicationTitle = YOUTH_PROFILE_LABELS.communicationTitle,
  challenges = [],
  challengesTitle = YOUTH_PROFILE_LABELS.challengesTitle,
  workerPrefs = null,
}) {
  const languages = (basicInfo?.languages || []).filter(Boolean)
  const hasBasic =
    basicInfo &&
    (basicInfo.age != null || basicInfo.gender || basicInfo.country || languages.length > 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {hasBasic && (
        <ProfileInfoCard title="Basic Information">
          {basicInfo.age != null && <InfoChip label="Age" value={String(basicInfo.age)} />}
          {basicInfo.gender && <InfoChip label="Gender" value={basicInfo.gender} />}
          {basicInfo.country && <InfoChip label="Country" value={basicInfo.country} />}
          {languages.map((lang) => (
            <InfoChip key={lang} label="Language" value={lang} />
          ))}
        </ProfileInfoCard>
      )}

      {workerPrefs && (
        <ProfileInfoCard title="Youth Worker Preference">
          {workerPrefs.gender && <InfoChip label="Preferred gender" value={workerPrefs.gender} />}
          {workerPrefs.ageRange && <InfoChip label="Preferred age range" value={workerPrefs.ageRange} />}
        </ProfileInfoCard>
      )}

      <ChipSection title="Interests" items={interests} />
      <ChipSection title={communicationTitle} items={communicationStyle} />
      <ChipSection title={challengesTitle} items={challenges} />
    </div>
  )
}

export function mapYouthQuestionnaireToProfile(questionnaire) {
  if (!questionnaire) return null
  const age =
    questionnaire.age != null
      ? Number(questionnaire.age)
      : calculateAgeFromDob(questionnaire.date_of_birth)
  return {
    basicInfo: {
      age: age != null && !Number.isNaN(age) ? age : null,
      gender: questionnaire.gender,
      country: questionnaire.country,
      languages: questionnaire.languages || [],
    },
    interests: questionnaire.interests || [],
    communicationStyle: questionnaire.preferred_communication_style || [],
    challenges: questionnaire.current_challenges || [],
    workerPrefs: questionnaire.preferred_worker_gender
      ? {
          gender: questionnaire.preferred_worker_gender,
          ageRange: questionnaire.preferred_worker_age_range,
        }
      : null,
  }
}

export function mapStaffQuestionnaireToProfile(questionnaire) {
  if (!questionnaire) return null
  return {
    basicInfo: {
      age: resolveStaffProfileAge(questionnaire),
      gender: questionnaire.gender,
      country: questionnaire.country,
      languages: questionnaire.languages || [],
    },
    interests: questionnaire.interests || [],
    communicationStyle: questionnaire.support_style || [],
    challenges: questionnaire.areas_of_expertise || [],
  }
}
