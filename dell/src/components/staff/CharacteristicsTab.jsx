import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hasDynamicProfileData, isYouthProfileFieldVisible, profileDynamicFieldsForDisplay } from '../../lib/dynamicProfile'
import { requireInsforge } from '../../lib/insforgeClient'
import { loadYouthInsights } from '../../services/insightsFallbackService'
import { regenerateYouthProfileInsights } from '../../services/staffAiService'
import {
  formatTagsForEdit,
  saveDynamicProfileField,
  saveInsightTagField,
  saveInsightTextField,
} from '../../services/staffEditService'
import { normalizeQuestionnaireRow } from '../../services/questionnaireService'
import { canStaffEditYouth } from '../../services/staffService'
import EditableSection from './EditableSection'
import OverallSummaryDisplay from './OverallSummaryDisplay'
import { YouthProfileField, YouthProfileLegend } from './YouthProfileField'
import RiskBadge from './RiskBadge'

const EMPTY = 'Not enough information yet'

const PROFILE_VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'static', label: 'Youth Profile' },
  { id: 'ai', label: 'Care Insights' },
]

const YOUTH_PROFILE_VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'static', label: 'Static' },
  { id: 'dynamic', label: 'Dynamic' },
]

const PROFILE_FIELD_DEFS = [
  { key: 'interests', title: 'Interests' },
  { key: 'personality', title: 'Personality' },
  {
    key: 'preferred_communication_style',
    title: 'Preferred Communication Style',
    hint: 'How the youth prefers to be approached',
  },
  { key: 'living_arrangement', title: 'Family Situation', isSingle: true },
  { key: 'current_challenges', title: 'Current Challenges' },
  { key: 'coping_methods', title: 'Coping Methods' },
]

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

function BasicInformationSection({ questionnaire }) {
  if (!questionnaire) return null

  const hasBasic =
    questionnaire.age != null ||
    questionnaire.gender ||
    questionnaire.country ||
    (questionnaire.languages || []).length

  const hasWorkerPrefs =
    questionnaire.preferred_worker_gender || questionnaire.preferred_worker_age_range

  if (!hasBasic && !hasWorkerPrefs) return null

  const languages = (questionnaire.languages || []).filter(Boolean)

  return (
    <>
      {hasBasic && (
        <ProfileInfoCard title="Basic Information">
          {questionnaire.age != null && <InfoChip label="Age" value={String(questionnaire.age)} />}
          {questionnaire.gender && <InfoChip label="Gender" value={questionnaire.gender} />}
          {questionnaire.country && <InfoChip label="Country" value={questionnaire.country} />}
          {languages.length > 0 &&
            languages.map((lang) => <InfoChip key={lang} label="Language" value={lang} />)}
        </ProfileInfoCard>
      )}
      {hasWorkerPrefs && (
        <ProfileInfoCard title="Youth Worker Preference">
          {questionnaire.preferred_worker_gender && (
            <InfoChip label="Preferred gender" value={questionnaire.preferred_worker_gender} />
          )}
          {questionnaire.preferred_worker_age_range && (
            <InfoChip label="Preferred age range" value={questionnaire.preferred_worker_age_range} />
          )}
        </ProfileInfoCard>
      )}
    </>
  )
}

function ViewToggle({ active, onChange, options = PROFILE_VIEWS }) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            active === item.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function formatUpdatedAt(iso) {
  if (!iso) return 'Not yet updated'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return 'Recently'
  }
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function insightTags(items) {
  const cleaned = (items || []).filter(Boolean).map(String)
  return cleaned.length ? cleaned : [EMPTY]
}

function SectionBadge({ children, tone = 'slate' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

function LimitedTags({ items, max = 3, accent = 'teal' }) {
  const [expanded, setExpanded] = useState(false)
  const cleaned = insightTags(items).filter((t) => t !== EMPTY)
  if (!cleaned.length) {
    return <span className="text-sm text-slate-400">{EMPTY}</span>
  }

  const chipClass =
    accent === 'teal'
      ? 'bg-teal-50 text-teal-800 ring-teal-100'
      : 'bg-slate-50 text-slate-700 ring-slate-100'

  const hasMore = cleaned.length > max
  const visible = expanded || !hasMore ? cleaned : cleaned.slice(0, max)
  const hiddenCount = cleaned.length - max

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <span key={item} className={`rounded-2xl px-3 py-1.5 text-sm font-medium ring-1 ${chipClass}`}>
            {item}
          </span>
        ))}
        {hasMore && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-200"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>
      {hasMore && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Show less
        </button>
      )}
    </div>
  )
}

function InsightBlock({ title, hint, children, className = '', editable = null }) {
  if (editable) {
    return (
      <div className={`rounded-2xl border border-slate-100 bg-slate-50/60 p-4 ${className}`}>
        <EditableSection {...editable}>{children}</EditableSection>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-slate-100 bg-slate-50/60 p-4 ${className}`}>
      <div className="mb-2">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export default function CharacteristicsTab({ detail, refreshKey = 0, staffProfileId = null, canEdit = false }) {
  const youthId = detail?.youth?.id
  const youthName = detail?.name || 'Youth'

  const [insights, setInsights] = useState(detail?.insights || {})
  const [insightsSource, setInsightsSource] = useState('')
  const [insightsMeta, setInsightsMeta] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [insightsUnavailable, setInsightsUnavailable] = useState(false)

  const [profileView, setProfileView] = useState('all')
  const [youthProfileView, setYouthProfileView] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [regenRunning, setRegenRunning] = useState(false)

  const [questionnaire, setQuestionnaire] = useState(null)
  const [questionnaireError, setQuestionnaireError] = useState('')
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(true)
  const regenAttemptedRef = useRef(false)

  const showAtAGlance = profileView === 'all' || profileView === 'ai'
  const showAiInsights = profileView === 'all' || profileView === 'ai'
  const showStaticProfile = profileView === 'all' || profileView === 'static'

  const loadInsights = useCallback(async () => {
    if (!youthId) {
      setLoadingInsights(false)
      return
    }

    setLoadingInsights(true)
    setInsightsUnavailable(false)

    try {
      const result = await loadYouthInsights(requireInsforge().database, youthId, youthName)
      setInsights(result.insights || {})
      setInsightsSource(result.source || '')
      setInsightsMeta(result.meta || null)
    } catch {
      setInsights({})
      setInsightsSource('')
      setInsightsMeta(null)
      setInsightsUnavailable(true)
    }
    setLoadingInsights(false)
  }, [youthId, youthName])

  const loadQuestionnaire = useCallback(async () => {
    if (!youthId) {
      setQuestionnaireError('Profile information is not available for this youth.')
      setLoadingQuestionnaire(false)
      return
    }

    setLoadingQuestionnaire(true)
    setQuestionnaireError('')

    const { data, error } = await requireInsforge()
      .database.from('youth_questionnaire')
      .select('*')
      .eq('youth_id', youthId)
      .maybeSingle()

    if (error) {
      setQuestionnaireError('Questionnaire could not be loaded. Please try refreshing the page.')
      setLoadingQuestionnaire(false)
      return
    }

    if (!data) {
      setQuestionnaire(null)
      setQuestionnaireError('')
      setLoadingQuestionnaire(false)
      return
    }

    setQuestionnaire(normalizeQuestionnaireRow(data))
    setLoadingQuestionnaire(false)
  }, [youthId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await loadInsights()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [loadInsights, refreshKey])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadInsights()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadInsights])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await loadQuestionnaire()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [loadQuestionnaire, refreshKey])

  useEffect(() => {
    if (loadingInsights || !youthId || regenAttemptedRef.current) return

    const dynamicPreview = profileDynamicFieldsForDisplay(insights.dynamic_profile || {})
    const profileEmpty =
      !insights.overall_summary?.trim() &&
      !(insights.current_state || []).length &&
      !(insights.main_risk || []).length &&
      !insights.latest_change?.trim() &&
      !hasDynamicProfileData(dynamicPreview)

    if (!profileEmpty) return

    regenAttemptedRef.current = true
    setRegenRunning(true)
    setRegenError('')
    regenerateYouthProfileInsights(youthId)
      .then(() => loadInsights())
      .catch((error) => {
        setRegenError(error?.message || 'Profile generation failed. Click refresh to retry.')
        console.warn('[staff] auto profile regen failed:', error?.message || error)
      })
      .finally(() => setRegenRunning(false))
  }, [loadingInsights, youthId, insights, loadInsights])

  useEffect(() => {
    regenAttemptedRef.current = false
  }, [youthId, refreshKey])

  const handleRefreshInsights = useCallback(async () => {
    setRefreshing(true)
    setRegenError('')
    try {
      if (youthId) {
        setRegenRunning(true)
        try {
          await regenerateYouthProfileInsights(youthId)
        } catch (regenError) {
          setRegenError(regenError?.message || 'Profile generation failed.')
          console.warn('[staff] profile regen on refresh failed:', regenError?.message || regenError)
        } finally {
          setRegenRunning(false)
        }
      }
      await Promise.all([loadInsights(), loadQuestionnaire()])
    } finally {
      setRefreshing(false)
    }
  }, [loadInsights, loadQuestionnaire, youthId])

  const lastUpdatedAt = insights.last_activity_at || insights.updated_at

  const staticFields = useMemo(
    () => ({
      interests: questionnaire?.interests || [],
      personality: [],
      preferred_communication_style: questionnaire?.preferred_communication_style || [],
      living_arrangement: '',
      current_challenges: questionnaire?.current_challenges || [],
      coping_methods: [],
    }),
    [questionnaire],
  )

  const dynamicFields = useMemo(
    () =>
      profileDynamicFieldsForDisplay({
        interests: insights.dynamic_profile?.interests || [],
        personality: insights.dynamic_profile?.personality || [],
        preferred_communication_style: insights.dynamic_profile?.preferred_communication_style || [],
        living_arrangement: insights.dynamic_profile?.living_arrangement || '',
        current_challenges: insights.dynamic_profile?.current_challenges || [],
        coping_methods: insights.dynamic_profile?.coping_methods || [],
      }),
    [insights.dynamic_profile],
  )

  const hasDynamicData = hasDynamicProfileData(dynamicFields)

  const hasStaticData = useMemo(
    () => {
      const hasBasic =
        questionnaire?.age != null ||
        questionnaire?.gender ||
        questionnaire?.country ||
        (questionnaire?.languages || []).length
      const hasFields = PROFILE_FIELD_DEFS.some((field) => {
        if (!isYouthProfileFieldVisible(field.key, 'static')) return false
        const value = staticFields[field.key]
        return field.isSingle ? Boolean(value) : (value || []).length > 0
      })
      return hasBasic || hasFields
    },
    [staticFields, questionnaire],
  )

  const showProfileGrid =
    youthProfileView === 'static'
      ? !loadingQuestionnaire
      : youthProfileView === 'dynamic'
        ? !loadingInsights
        : (!loadingInsights && hasDynamicData) || !loadingQuestionnaire

  const latestChange = insights.latest_change?.trim()
  const riskLevel = insights.risk_level || 'low'
  const staffEdited = insights.staff_edited_fields || {}
  const isAssignedWorker = canStaffEditYouth(detail?.youth, staffProfileId)
  const canSaveEdits = Boolean(youthId && staffProfileId && isAssignedWorker)

  const saveAndReload = useCallback(
    async (saveFn) => {
      await saveFn()
      await loadInsights()
    },
    [loadInsights],
  )

  const hasInsights =
    insights.overall_summary ||
    (insights.current_state || []).length ||
    (insights.main_risk || []).length ||
    (insights.best_communication_approach || []).length ||
    hasDynamicData ||
    latestChange

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Profile and Insights</h2>
          <p className="mt-1 text-sm text-slate-500">
            Combined AI insights from offline counselling and after-hours online contact for {youthName}
          </p>
        </div>
        <ViewToggle active={profileView} onChange={setProfileView} />
      </header>


      {showAtAGlance && (
        <section className="rounded-3xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/40 p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900">At a Glance</h3>
            <RiskBadge level={riskLevel} />
            <SectionBadge tone="teal">AI · Live</SectionBadge>
            {canSaveEdits && (
              <SectionBadge tone="teal">Editable</SectionBadge>
            )}
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              Last Updated:{' '}
              {loadingInsights || refreshing
                ? 'Loading…'
                : formatUpdatedAt(lastUpdatedAt)}
              <button
                type="button"
                onClick={handleRefreshInsights}
                disabled={refreshing || loadingInsights}
                aria-label="Refresh insights"
                title="Refresh insights"
                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshIcon />
              </button>
            </span>
          </div>

          <div className="mt-5">
            <EditableSection
              title="Overall Summary"
              hint="Continuous case overview — who they are, what they have been through, and what affects them now"
              value={insights.overall_summary || ''}
              staffEdited={Boolean(staffEdited.overall_summary)}
              disabled={!canSaveEdits || loadingInsights}
              onSave={(text) =>
                saveAndReload(() => saveInsightTextField(youthId, 'overall_summary', text, staffProfileId))
              }
            >
              {loadingInsights ? (
                <p className="text-sm text-slate-500">Loading summary…</p>
              ) : (
                <OverallSummaryDisplay text={insights.overall_summary} />
              )}
            </EditableSection>
          </div>

          {riskLevel === 'high' && !loadingInsights && (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Elevated risk detected in recent sessions. Prioritize a supportive follow-up.
            </p>
          )}

          {insights.crisis_detected && !loadingInsights && (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Crisis-level content was detected in a recent AI chat. Review the timeline and follow up promptly.
            </p>
          )}

          {!canSaveEdits && detail?.youth?.assigned_staff_id && !isAssignedWorker && (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              This youth is assigned to another worker. Only the assigned worker can edit profile and insights.
            </p>
          )}

          {!canSaveEdits && !detail?.youth?.assigned_staff_id && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Assign this youth to yourself from the dashboard to enable editing.
            </p>
          )}

          {regenRunning && (
            <p className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Generating profile from chat history… This may take up to a minute.
            </p>
          )}

          {regenError && (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {regenError}
            </p>
          )}

          {insightsUnavailable && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Insights are temporarily unavailable. Please refresh the page or try again later.
            </p>
          )}

          {!loadingInsights && insightsMeta?.hasRecentSessions && insightsMeta?.youthMsgCount === 0 && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Live AI chat messages could not be loaded for this youth. Profile may show saved data only. Run{' '}
              <strong>scripts/APPLY-FIX-STAFF-READ-YOUTH.sql</strong> in InsForge SQL Editor if this persists.
            </p>
          )}
        </section>
      )}

      {showAiInsights && (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">Current Care Insights</h3>
              <SectionBadge tone="teal">Live</SectionBadge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Updated from online AI chat and offline session uploads · Current state reflects the latest exchange
            </p>
          </div>
        </header>

        {loadingInsights && <p className="text-sm text-slate-500">Loading insights…</p>}

        {!loadingInsights && insightsSource === 'empty' && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No AI conversations yet. Insights will appear after the youth uses AI Companion.
          </p>
        )}

        {!loadingInsights && hasInsights && (
          <div className="grid gap-4 lg:grid-cols-2">
            <InsightBlock
              editable={{
                title: 'Current State',
                hint: 'How the youth seems right now',
                value: formatTagsForEdit(insights.current_state),
                mode: 'tags',
                staffEdited: Boolean(staffEdited.current_state),
                disabled: !canSaveEdits,
                onSave: (text) =>
                  saveAndReload(() => saveInsightTagField(youthId, 'current_state', text, staffProfileId)),
              }}
            >
              <LimitedTags items={insights.current_state} max={3} accent="teal" />
            </InsightBlock>

            <InsightBlock
              editable={{
                title: 'Main Risk',
                hint: 'Concerns observed from past to present',
                value: formatTagsForEdit(insights.main_risk),
                mode: 'tags',
                staffEdited: Boolean(staffEdited.main_risk),
                disabled: !canSaveEdits,
                onSave: (text) =>
                  saveAndReload(() => saveInsightTagField(youthId, 'main_risk', text, staffProfileId)),
              }}
            >
              <LimitedTags items={insights.main_risk} max={5} accent="teal" />
            </InsightBlock>

            <InsightBlock
              className="lg:col-span-2"
              editable={{
                title: 'Best Communication Approach',
                hint: 'Practical tips based on AI conversations (not the questionnaire)',
                value: formatTagsForEdit(insights.best_communication_approach),
                mode: 'tags',
                staffEdited: Boolean(staffEdited.best_communication_approach),
                disabled: !canSaveEdits,
                onSave: (text) =>
                  saveAndReload(() =>
                    saveInsightTagField(youthId, 'best_communication_approach', text, staffProfileId),
                  ),
              }}
            >
              <LimitedTags items={insights.best_communication_approach} max={5} accent="teal" />
            </InsightBlock>

            <div className="lg:col-span-2">
              <InsightBlock
                editable={{
                  title: 'Latest Interaction Insight',
                  hint: 'Most meaningful insight from the latest interaction',
                  value: latestChange || '',
                  staffEdited: Boolean(staffEdited.latest_change),
                  disabled: !canSaveEdits,
                  onSave: (text) =>
                    saveAndReload(() => saveInsightTextField(youthId, 'latest_change', text, staffProfileId)),
                }}
              >
                <p className="border-l-2 border-teal-300 pl-4 text-sm leading-relaxed text-slate-700 italic">
                  {latestChange || EMPTY}
                </p>
              </InsightBlock>
            </div>
          </div>
        )}
      </section>
      )}

      {showStaticProfile && (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Youth Profile</h3>
            <p className="mt-1 text-sm text-slate-500">
              Onboarding answers (static) and AI-discovered updates (dynamic) in the same fields
            </p>
          </div>
          <ViewToggle active={youthProfileView} onChange={setYouthProfileView} options={YOUTH_PROFILE_VIEWS} />
        </header>

        {youthProfileView === 'all' && <YouthProfileLegend />}

        {loadingQuestionnaire && youthProfileView !== 'dynamic' && (
          <p className="text-sm text-slate-500">Loading youth profile…</p>
        )}

        {questionnaireError && youthProfileView !== 'dynamic' && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {questionnaireError}
          </p>
        )}

        {!loadingQuestionnaire && youthProfileView === 'static' && !hasStaticData && (
          <p className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-900">
            No onboarding questionnaire on file yet. Static fields will appear after the youth completes onboarding.
          </p>
        )}

        {loadingInsights && youthProfileView === 'dynamic' && (
          <p className="text-sm text-slate-500">Loading AI-discovered profile…</p>
        )}

        {!loadingInsights && youthProfileView === 'dynamic' && !hasDynamicData && !showProfileGrid && (
          <p className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-900">
            No dynamic profile items yet. They will appear after the youth chats with AI or staff uploads an offline
            session.
          </p>
        )}

        {showProfileGrid && (
          <div className="grid gap-4 lg:grid-cols-2">
            {youthProfileView !== 'dynamic' && (
              <BasicInformationSection questionnaire={questionnaire} />
            )}
            {PROFILE_FIELD_DEFS.filter((field) => isYouthProfileFieldVisible(field.key, youthProfileView)).map((field) => {
              const staticValue = staticFields[field.key]
              const dynamicValue = dynamicFields[field.key]
              const staticItems = field.isSingle
                ? staticValue
                  ? [staticValue]
                  : []
                : staticValue || []
              const dynamicItems = field.isSingle
                ? dynamicValue
                  ? [dynamicValue]
                  : []
                : dynamicValue || []
              const metaKey = `dynamic_profile.${field.key}`
              const showDynamicEdit = canSaveEdits && (youthProfileView === 'dynamic' || youthProfileView === 'all')

              if (showDynamicEdit && (dynamicItems.length || youthProfileView === 'dynamic')) {
                return (
                  <div key={field.key} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <EditableSection
                      title={field.title}
                      hint={field.hint}
                      value={field.isSingle ? dynamicValue || '' : formatTagsForEdit(dynamicItems)}
                      mode={field.isSingle ? 'textarea' : 'tags'}
                      staffEdited={Boolean(staffEdited[metaKey])}
                      onSave={(text) =>
                        saveAndReload(() =>
                          saveDynamicProfileField(youthId, field.key, text, staffProfileId, {
                            isSingle: field.isSingle,
                          }),
                        )
                      }
                    >
                      {staticItems.map((item) => (
                        <span
                          key={`s-${item}`}
                          className="rounded-2xl bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-200"
                        >
                          {item}
                        </span>
                      ))}
                      {dynamicItems.map((item) => (
                        <span
                          key={`d-${item}`}
                          className="rounded-2xl bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800 ring-1 ring-violet-200"
                        >
                          {item}
                        </span>
                      ))}
                      {!staticItems.length && !dynamicItems.length && (
                        <span className="text-sm text-slate-400">{EMPTY}</span>
                      )}
                    </EditableSection>
                  </div>
                )
              }

              return (
                <YouthProfileField
                  key={field.key}
                  title={field.title}
                  hint={field.hint}
                  staticItems={staticItems}
                  dynamicItems={dynamicItems}
                  view={youthProfileView}
                />
              )
            })}
          </div>
        )}
      </section>
      )}
    </div>
  )
}
