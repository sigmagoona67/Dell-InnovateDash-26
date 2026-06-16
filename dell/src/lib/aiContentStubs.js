/** Shared empty shapes and schema-only prompts. Content rules intentionally removed. */

export const EMPTY_DYNAMIC_PROFILE = {
  interests: [],
  personality: [],
  preferred_communication_style: [],
  living_arrangement: '',
  current_challenges: [],
  coping_methods: [],
}

export const EMPTY_MORNING_BRIEF = {
  overnight_summary: '',
  follow_up_priority: 'routine',
}

export function emptyInsightsFallback() {
  return {
    current_state: [],
    main_risk: [],
    best_communication_approach: [],
    latest_change: '',
    overall_summary: '',
    dynamic_profile: { ...EMPTY_DYNAMIC_PROFILE },
    risk_level: 'low',
    morning_brief: { ...EMPTY_MORNING_BRIEF },
  }
}

export function emptyOfflineSummaryPackage() {
  return {
    ai_summary: '',
    overall_summary: '',
    dynamic_profile: { ...EMPTY_DYNAMIC_PROFILE },
    emotion_analysis: [],
    categories: [],
    risk_level: 'low',
    main_risk: [],
    best_communication_approach: [],
    suggested_follow_up: '',
    current_state: [],
    latest_change: '',
  }
}

export const INSIGHTS_JSON_SCHEMA_PROMPT = `Content generation rules are not configured. Return ONLY valid JSON with this shape. Use empty strings or arrays when unsure.
{
  "current_state": [],
  "main_risk": [],
  "best_communication_approach": [],
  "latest_change": "",
  "overall_summary": "",
  "dynamic_profile": {
    "interests": [],
    "personality": [],
    "preferred_communication_style": [],
    "living_arrangement": "",
    "current_challenges": [],
    "coping_methods": []
  },
  "risk_level": "low",
  "morning_brief": {
    "overnight_summary": "",
    "follow_up_priority": "routine"
  }
}`

export const SESSION_SUMMARY_JSON_SCHEMA_PROMPT =
  'Content generation rules are not configured. Return ONLY valid JSON: { "session_summary": "" }'

export const STAFF_OFFLINE_JSON_SCHEMA_PROMPT = `Content generation rules are not configured. Return ONLY valid JSON:
{
  "ai_summary": "",
  "dynamic_profile": {
    "interests": [],
    "personality": [],
    "preferred_communication_style": [],
    "living_arrangement": "",
    "current_challenges": [],
    "coping_methods": []
  },
  "emotion_analysis": [],
  "categories": [],
  "risk_level": "low",
  "main_risk": [],
  "best_communication_approach": [],
  "suggested_follow_up": "",
  "current_state": []
}`

export const YOUTH_CHAT_JSON_SCHEMA_PROMPT = `You are CareBridge AI. Content generation rules are not configured. Return ONLY valid JSON:
{
  "reply": "string",
  "summary": "",
  "riskLevel": "low",
  "escalationNeeded": false
}`
