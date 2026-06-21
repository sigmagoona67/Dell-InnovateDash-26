import { ProfileChip } from '../onboarding/OnboardingShell'

function BasicInfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-blue-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  )
}

function ChipSection({ title, items = [] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5">
      <h3 className="mb-3 text-base font-semibold text-slate-800">{title}</h3>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <ProfileChip key={item} label={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Not provided yet</p>
      )}
    </section>
  )
}

export default function QuestionnaireProfileView({
  basicInfo,
  interests = [],
  communicationStyle = [],
  communicationTitle = 'Preferred Communication Style',
  challenges = [],
  challengesTitle = 'Current Challenges',
  workerPrefs = null,
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-5">
        <h3 className="mb-4 text-lg font-bold text-slate-800">Basic Information</h3>
        <div className="rounded-2xl bg-slate-50/80 px-4">
          <BasicInfoRow label="Age" value={basicInfo?.age != null ? String(basicInfo.age) : null} />
          <BasicInfoRow label="Gender" value={basicInfo?.gender} />
          <BasicInfoRow label="Country" value={basicInfo?.country} />
          <BasicInfoRow
            label="Languages spoken"
            value={(basicInfo?.languages || []).join(', ') || null}
          />
          {workerPrefs && (
            <>
              <BasicInfoRow label="Preferred worker gender" value={workerPrefs.gender} />
              <BasicInfoRow label="Preferred worker age range" value={workerPrefs.ageRange} />
            </>
          )}
        </div>
      </section>

      <ChipSection title="Interests" items={interests} />
      <ChipSection title={communicationTitle} items={communicationStyle} />
      <ChipSection title={challengesTitle} items={challenges} />
    </div>
  )
}

export function mapYouthQuestionnaireToProfile(questionnaire) {
  if (!questionnaire) return null
  return {
    basicInfo: {
      age: questionnaire.age,
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
      age: questionnaire.age,
      gender: questionnaire.gender,
      country: questionnaire.country,
      languages: questionnaire.languages || [],
    },
    interests: questionnaire.interests || [],
    communicationStyle: questionnaire.support_style || [],
    challenges: questionnaire.areas_of_expertise || [],
  }
}
