import { extractTextFromFile } from '../lib/documentParser'
import { mergeDynamicProfileForPersist } from '../lib/dynamicProfile'
import { buildCombinedOverallSummary, regenerateAtAGlance, collectAtAGlanceContext } from '../lib/atAGlance'
import { isWeakAiSummary, finalizeOfflineSessionSummary } from '../lib/offlineSummaryParser'
import { mergeOfflineIntoInsights } from './insightsMergeService'
import {
  approveSession,
  createDraftSession,
  findSessionForDate,
  getApprovedSessions,
  updateDraftSession,
} from './offlineSessionService'
import { normalizeQuestionnaireRow } from './questionnaireService'
import { buildMockOfflineSummary, generateOfflineSummary } from './staffAiService'
import { regenerateYouthProfileInsights } from './staffAiService'
import { upsertInsights } from './staffInsightsService'
import { requireInsforge } from '../lib/insforgeClient'

async function loadQuestionnaire(youthId) {
  const { data, error } = await requireInsforge()
    .database.from('youth_questionnaire')
    .select('*')
    .eq('youth_id', youthId)
    .maybeSingle()

  if (error) throw error
  return data ? normalizeQuestionnaireRow(data) : null
}

function isTimeoutError(error) {
  const msg = String(error?.message || '').toLowerCase()
  return msg.includes('timed out') || msg.includes('timeout')
}

function toOfflineSessionRow(summary, documentName) {
  return {
    ai_summary: summary.ai_summary,
    emotion_analysis: summary.emotion_analysis || [],
    categories: summary.categories || [],
    risk_level: summary.risk_level || 'low',
    main_risk: summary.main_risk || [],
    best_communication_approach: summary.best_communication_approach || [],
    latest_change: summary.latest_change || '',
    suggested_follow_up: summary.suggested_follow_up || '',
    document_name: documentName || null,
  }
}

export async function processOfflineDocument({
  file,
  pastedText,
  youthId,
  staffId,
  youthName,
  previousInsights,
  sessionDate,
}) {
  let transcript = pastedText?.trim() || ''
  let documentName = null

  if (file) {
    transcript = await extractTextFromFile(file)
    documentName = file.name
  }

  if (!transcript?.trim()) {
    throw new Error('Upload a document or paste a transcript first.')
  }

  if (transcript.trim().length < 30) {
    throw new Error(
      'This document looks empty. Use fixtures/demo-offline-session-transcript.txt or paste the session notes.',
    )
  }

  const questionnaire = await loadQuestionnaire(youthId)
  const date = sessionDate || new Date().toISOString().slice(0, 10)

  let summary
  let usedLocalFallback = false

  try {
    summary = await generateOfflineSummary({
      transcript,
      previousInsights,
      youthName,
      questionnaire,
    })
  } catch (error) {
    usedLocalFallback = true
    summary = buildMockOfflineSummary(transcript, previousInsights, youthName, questionnaire)
    summary._fallbackReason = isTimeoutError(error)
      ? 'AI service timed out. Showing a local summary so you can still test the workflow.'
      : 'AI service unavailable. Showing a local summary so you can still test the workflow.'
  }

  if (isWeakAiSummary(summary.ai_summary)) {
    summary = buildMockOfflineSummary(transcript, previousInsights, youthName, questionnaire)
  }

  summary = finalizeOfflineSessionSummary(summary)

  const existing = await findSessionForDate(youthId, date)
  let updated

  if (existing) {
    updated = await updateDraftSession(existing.id, {
      transcript,
      staff_id: staffId,
      status: 'draft',
      approved_at: null,
      ...toOfflineSessionRow(summary, documentName),
    })
  } else {
    const session = await createDraftSession({
      youthId,
      staffId,
      transcript,
      sessionDate: date,
    })
    updated = await updateDraftSession(session.id, toOfflineSessionRow(summary, documentName))
  }

  return {
    session: {
      ...updated,
      current_state: summary.current_state || [],
      overall_summary: summary.overall_summary,
      dynamic_profile: summary.dynamic_profile,
    },
    summary,
    usedLocalFallback,
    fallbackNotice: summary._fallbackReason || null,
  }
}

async function loadYouthChatContext(youthId) {
  const db = requireInsforge().database
  const [{ data: messages, error: msgError }, { data: aiSessions, error: sessError }] = await Promise.all([
    db
      .from('ai_messages')
      .select('sender, message, created_at')
      .eq('youth_id', youthId)
      .order('created_at', { ascending: true }),
    db
      .from('ai_chat_sessions')
      .select('session_date, mood_check_in, ai_summary, risk_level')
      .eq('youth_id', youthId)
      .order('session_date', { ascending: false })
      .limit(10),
  ])

  if (msgError) throw msgError
  if (sessError) throw sessError
  return { messages: messages || [], aiSessions: aiSessions || [] }
}

export async function approveOfflineSessionAndSyncInsights({
  session,
  youthId,
  staffProfileId,
  existingInsights,
  youthName,
}) {
  const approved = await approveSession(session.id)
  const questionnaire = await loadQuestionnaire(youthId)
  const allOfflineSessions = await getApprovedSessions(youthId)
  const { messages, aiSessions } = await loadYouthChatContext(youthId)

  const merged = mergeOfflineIntoInsights(
    existingInsights,
    {
      current_state: session.current_state,
      risk_level: session.risk_level,
      main_risk: session.main_risk,
      best_communication_approach: session.best_communication_approach,
      latest_change: session.latest_change || session.ai_summary,
      overall_summary: session.overall_summary || session.ai_summary,
      ai_summary: session.ai_summary,
      dynamic_profile: session.dynamic_profile,
    },
    {
      youthName,
      questionnaire,
      transcript: session.transcript,
      offlineSessions: allOfflineSessions,
      messages,
      aiSessions,
    },
  )

  const evidenceFiltered = {
    ...merged,
    overall_summary: regenerateAtAGlance({
      aiGenerated: merged.overall_summary,
      context: collectAtAGlanceContext({
        youthName,
        questionnaire,
        dynamicProfile: merged.dynamic_profile,
        careInsights: merged,
        existingOverallSummary: existingInsights?.overall_summary || '',
        messages,
        aiSessions,
        offlineSessions: allOfflineSessions,
      }),
    }),
    dynamic_profile: mergeDynamicProfileForPersist({
      savedProfile: existingInsights?.dynamic_profile,
      generatedProfile: merged.dynamic_profile,
      questionnaire,
    }),
  }

  await upsertInsights(youthId, evidenceFiltered, staffProfileId)

  try {
    await regenerateYouthProfileInsights(youthId, {
      summary: session.ai_summary || '',
      riskLevel: session.risk_level || merged.risk_level || 'low',
    })
  } catch (regenError) {
    console.warn('[offline] full profile regen after approve failed:', regenError?.message || regenError)
  }

  return { approved, insights: evidenceFiltered }
}
