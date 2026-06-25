import { hasCareInsightsData, resolveCareInsights } from '../lib/careInsights'
import { hasDynamicProfileData, resolveDynamicProfile } from '../lib/dynamicProfile'
import { shouldRewriteOverallSummary } from '../lib/interactionSummary'
import { mergeLivingInsights } from '../lib/livingMemory'
import { resolveYouthRiskLevel } from '../lib/riskResolver'
import { isCasualPositiveMessage } from '../lib/youthChatReply'
import { normalizeQuestionnaireRow } from './questionnaireService'

function latestYouthMessage(messages = []) {
  const lines = (messages || [])
    .filter((m) => m.sender === 'youth')
    .map((m) => String(m.message || '').trim())
    .filter(Boolean)
  return lines[lines.length - 1] || ''
}

function youthMessages(messages) {
  return (messages || []).filter((m) => m.sender === 'youth').map((m) => String(m.message || '').trim()).filter(Boolean)
}

function buildDisplayInsights(saved, risk, crisisDetected = false) {
  const care = resolveCareInsights({ savedProfile: saved })
  return {
    current_state: care.current_state,
    risk_level: risk,
    crisis_detected: Boolean(saved?.crisis_detected) || crisisDetected,
    main_risk: care.main_risk,
    best_communication_approach: care.best_communication_approach,
    latest_change: care.latest_change,
  }
}

function crisisFromSessions(sessions = []) {
  return (sessions || []).some((session) => Boolean(session.crisis_detected))
}

export function buildInsightsFromChat({ messages = [], sessions = [], youthName = 'This youth', offlineSessions = [] }) {
  const dynamic_profile = resolveDynamicProfile({})
  const merged = mergeLivingInsights({
    previous: {},
    generated: {},
    fallback: {},
    context: { youthName, messages, offlineSessions, dynamicProfile: dynamic_profile, aiSessions: sessions },
  })
  return {
    ...merged,
    _fromChatFallback: true,
  }
}

export function needsEnglishSummaryRewrite(text) {
  return shouldRewriteOverallSummary(text)
}

function computeLastActivityAt({ saved, messages, offlineSessions }) {
  const candidates = []
  if (saved?.updated_at) candidates.push(new Date(saved.updated_at).getTime())
  if (saved?.approved_at) candidates.push(new Date(saved.approved_at).getTime())

  for (const row of messages || []) {
    if (row.created_at) candidates.push(new Date(row.created_at).getTime())
  }
  for (const session of offlineSessions || []) {
    if (session.updated_at) candidates.push(new Date(session.updated_at).getTime())
    if (session.approved_at) candidates.push(new Date(session.approved_at).getTime())
  }

  const max = candidates.filter(Boolean).length ? Math.max(...candidates.filter(Boolean)) : null
  return max ? new Date(max).toISOString() : saved?.updated_at || null
}

function mergeInsightsForDisplay(saved, messages, sessions, youthName, context = {}) {
  const dynamic_profile = resolveDynamicProfile({
    savedProfile: saved?.dynamic_profile,
  })
  const care = resolveCareInsights({ savedProfile: saved })
  const risk = resolveYouthRiskLevel({
    insights: saved,
    aiSessions: sessions,
    offlineSessions: context.offlineSessions,
    messages,
  })
  const sessionCrisis = crisisFromSessions(sessions)
  const merged = mergeLivingInsights({
    previous: saved || {},
    generated: care,
    fallback: buildDisplayInsights(saved, risk, sessionCrisis),
    context: {
      youthName,
      messages,
      offlineSessions: context.offlineSessions,
      dynamicProfile: dynamic_profile,
      questionnaire: context.questionnaire,
      aiSessions: sessions,
    },
  })
  const last_activity_at = computeLastActivityAt({
    saved,
    messages,
    offlineSessions: context.offlineSessions,
  })

  return {
    ...(saved || {}),
    ...merged,
    risk_level: risk,
    crisis_detected: Boolean(saved?.crisis_detected) || sessionCrisis,
    dynamic_profile: merged.dynamic_profile,
    last_activity_at,
  }
}

export async function loadYouthInsights(db, youthId, youthName) {
  const [
    { data: saved, error: savedError },
    { data: messages, error: msgError },
    { data: sessions, error: sessError },
    { data: offlineSessions, error: offlineError },
    { data: questionnaireRow, error: questionnaireError },
  ] = await Promise.all([
    db.from('ai_dynamic_insights').select('*').eq('youth_id', youthId).maybeSingle(),
    db
      .from('ai_messages')
      .select('sender, message, created_at')
      .eq('youth_id', youthId)
      .order('created_at', { ascending: true }),
    db
      .from('ai_chat_sessions')
      .select('session_date, mood_check_in, ai_summary, risk_level, crisis_detected')
      .eq('youth_id', youthId)
      .order('session_date', { ascending: false })
      .limit(10),
    db
      .from('offline_counselling_sessions')
      .select('session_date, transcript, ai_summary, risk_level')
      .eq('youth_id', youthId)
      .eq('status', 'approved')
      .order('session_date', { ascending: false })
      .limit(10),
    db.from('youth_questionnaire').select('*').eq('youth_id', youthId).maybeSingle(),
  ])

  if (savedError) throw savedError
  if (sessError) throw sessError
  if (offlineError) throw offlineError
  if (questionnaireError) throw questionnaireError

  const readableMessages = msgError ? [] : messages || []
  if (msgError) {
    console.warn('[insights] staff could not read ai_messages:', msgError.message)
  }

  const questionnaire = questionnaireRow ? normalizeQuestionnaireRow(questionnaireRow) : null
  const youthMsgCount = youthMessages(readableMessages).length
  const hasOffline = (offlineSessions || []).length > 0
  const hasChatSessions = (sessions || []).length > 0
  const hasRecentSessions = (sessions || []).some(
    (session) => session.ai_summary?.trim() || session.mood_check_in,
  )
  const context = {
    questionnaire,
    offlineSessions: offlineSessions || [],
    messages: readableMessages,
    aiSessions: sessions || [],
  }

  const hasSavedInsights =
    Boolean(saved?.overall_summary?.trim()) ||
    hasCareInsightsData(saved) ||
    hasDynamicProfileData(saved?.dynamic_profile)

  if (!hasSavedInsights && youthMsgCount === 0 && !hasOffline && !hasRecentSessions && !hasChatSessions) {
    return { insights: {}, source: 'empty', meta: { youthMsgCount: 0, hasChatSessions: false } }
  }

  if (youthMsgCount === 0 && !hasRecentSessions && hasOffline) {
    const risk = resolveYouthRiskLevel({
      insights: saved,
      aiSessions: sessions,
      offlineSessions: offlineSessions,
      messages: readableMessages,
    })
    const sessionCrisis = crisisFromSessions(sessions)
    const dynamic_profile = resolveDynamicProfile({
      savedProfile: saved?.dynamic_profile,
    })
    const care = resolveCareInsights({ savedProfile: saved })
    const merged = mergeLivingInsights({
      previous: saved || {},
      generated: care,
      fallback: buildDisplayInsights(saved, risk, sessionCrisis),
      context: {
        youthName,
        messages: [],
        offlineSessions,
        dynamicProfile: dynamic_profile,
        questionnaire,
        aiSessions: sessions,
      },
    })
    const insights = saved
      ? {
          ...saved,
          ...merged,
          risk_level: risk,
          crisis_detected: Boolean(saved?.crisis_detected) || sessionCrisis,
          dynamic_profile: merged.dynamic_profile,
          last_activity_at: computeLastActivityAt({ saved, messages: [], offlineSessions }),
        }
      : {
          ...merged,
          risk_level: risk,
          crisis_detected: sessionCrisis,
          dynamic_profile: merged.dynamic_profile,
        }
    return {
      insights,
      source: 'database',
      meta: { youthMsgCount: 0, hasRecentSessions, messagesReadable: youthMsgCount > 0 },
    }
  }

  const merged = mergeInsightsForDisplay(saved, readableMessages, sessions || [], youthName, context)
  return {
    insights: merged,
    source: youthMsgCount > 0 ? 'live-merged' : saved ? 'database-merged' : 'chat-fallback',
    meta: {
      youthMsgCount,
      messageCount: readableMessages.length,
      hasRecentSessions,
      hasChatSessions,
      messagesReadable: !msgError,
      savedUpdatedAt: saved?.updated_at || null,
      lastActivityAt: merged.last_activity_at || null,
    },
  }
}
