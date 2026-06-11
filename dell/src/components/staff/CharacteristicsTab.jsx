import { useEffect, useMemo, useState } from 'react'
import { requireInsforge } from '../../lib/insforgeClient'
import { normalizeQuestionnaireRow } from '../../services/questionnaireService'
import { InfoCard, TagSection } from './TagSection'
import RiskBadge from './RiskBadge'

export default function CharacteristicsTab({ detail }) {
  const youthId = detail?.youth?.id
  const insights = detail?.insights || {}

  const [questionnaire, setQuestionnaire] = useState(null)
  const [questionnaireError, setQuestionnaireError] = useState('')
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(true)

  useEffect(() => {
    console.log('CharacteristicsTab loaded youth detail object:', detail)

    if (!youthId) {
      setQuestionnaireError('Missing youth id on detail object')
      setLoadingQuestionnaire(false)
      return
    }

    let cancelled = false

    async function loadQuestionnaire() {
      setLoadingQuestionnaire(true)
      setQuestionnaireError('')

      const { data, error } = await requireInsforge()
        .database.from('youth_questionnaire')
        .select('*')
        .eq('youth_id', youthId)
        .maybeSingle()

      console.log('Staff questionnaire result:', data, error)

      if (cancelled) return

      if (error) {
        if (
          String(error.message || '').toLowerCase().includes('does not exist') ||
          error.status === 404
        ) {
          setQuestionnaireError('Database setup incomplete. Please contact your administrator.')
        } else {
          setQuestionnaireError(error.message || 'Failed to load questionnaire')
        }
        setLoadingQuestionnaire(false)
        return
      }

      if (!data) {
        setQuestionnaire(null)
        setQuestionnaireError(
          'No questionnaire record found for this youth. If onboarding was completed, staff read access may be missing — run migrations/20260610330000_carebridge-staff-read-access.sql in InsForge SQL Editor.',
        )
        setLoadingQuestionnaire(false)
        return
      }

      const normalized = normalizeQuestionnaireRow(data)
      const mappedProfile = {
        interests: normalized.interests,
        personality: normalized.personality,
        preferred_communication_style: normalized.preferred_communication_style,
        living_arrangement: normalized.living_arrangement,
        current_challenges: normalized.current_challenges,
        coping_methods: normalized.coping_methods,
      }

      console.log('CharacteristicsTab mapped Youth Profile fields:', mappedProfile)

      setQuestionnaire(normalized)
      setLoadingQuestionnaire(false)
    }

    loadQuestionnaire()

    return () => {
      cancelled = true
    }
  }, [detail, youthId])

  const profileFields = useMemo(
    () => ({
      interests: questionnaire?.interests || [],
      personality: questionnaire?.personality || [],
      preferred_communication_style: questionnaire?.preferred_communication_style || [],
      living_arrangement: questionnaire?.living_arrangement || '',
      current_challenges: questionnaire?.current_challenges || [],
      coping_methods: questionnaire?.coping_methods || [],
    }),
    [questionnaire],
  )

  return (
    <div className="space-y-8">
      <section>
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Youth Profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            Source: Youth Questionnaire · Editable by youth only · AI never modifies this section
          </p>
        </header>

        {loadingQuestionnaire && (
          <p className="mb-4 text-sm text-slate-500">Loading questionnaire from backend…</p>
        )}

        {questionnaireError && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {questionnaireError}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <TagSection title="Interests" items={profileFields.interests} footer="Managed by Youth Questionnaire" />
          <TagSection title="Personality" items={profileFields.personality} />
          <TagSection title="Preferred Communication Style" items={profileFields.preferred_communication_style} />
          <TagSection
            title="Family Situation"
            items={profileFields.living_arrangement ? [profileFields.living_arrangement] : []}
          />
          <TagSection title="Current Challenges" items={profileFields.current_challenges} />
          <TagSection title="Coping Methods" items={profileFields.coping_methods} />
        </div>
      </section>

      <section>
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">AI Dynamic Insights</h2>
            <p className="mt-1 text-sm text-slate-500">
              Automatically updated from AI conversations, offline transcripts, and mood check-ins
            </p>
          </div>
          <RiskBadge level={insights.risk_level || 'low'} />
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="Current State" items={insights.current_state} accent="teal" />
          <InfoCard
            title="Risk Level"
            items={[insights.risk_level ? `${insights.risk_level} risk` : 'Not assessed']}
          />
          <InfoCard title="Main Risk" items={insights.main_risk} />
          <InfoCard title="Best Communication Approach" items={insights.best_communication_approach} />
          <InfoCard
            title="Latest Change"
            items={insights.latest_change ? [insights.latest_change] : []}
            footer="Automatically updated by AI"
          />
        </div>
      </section>
    </div>
  )
}
