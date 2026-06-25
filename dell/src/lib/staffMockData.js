export const RISK_ORDER = { high: 0, medium: 1, low: 2 }

// Risk reads by weight + shape + label via the shared <RiskBadge> primitive.
// Tokens here back any non-badge consumer; never emoji/color alone.
export const RISK_LABELS = {
  high: { label: 'High risk', className: 'bg-danger-600 text-white' },
  medium: { label: 'Medium risk', className: 'bg-warning-100 text-warning-500' },
  low: { label: 'Low risk', className: 'bg-success-100 text-success-600' },
}

export const MOCK_STAFF_PROFILE = {
  id: 'mock-staff-1',
  display_name: 'Jordan Lee',
  email: 'jordan@carebridge.demo',
}

export const MOCK_ASSIGNED_YOUTH = [
  {
    id: 'mock-youth-1',
    name: 'Alex',
    riskLevel: 'high',
    hasNew: true,
    currentChallenges: ['Exam stress', 'Family conflict'],
    aiSummary: 'Recent AI chats show increased hopelessness and poor sleep after family conflict.',
    questionnaire: {
      interests: ['Drawing', 'Gaming', 'Quiet Music'],
      personality: ['Sensitive', 'Introverted', 'Creative'],
      preferred_communication_style: [
        'Responds better to gentle questions',
        'Likes indirect conversations',
        'Prefers patient listeners',
      ],
      living_arrangement: 'Living with mother — ongoing conflict with mother',
      current_challenges: ['Exam stress', 'Family conflict', 'Sleep problems'],
      coping_methods: ['Drawing', 'Music', 'Talking to friends'],
    },
    insights: {
      current_state: ['Sad', 'Anxious', 'Poor sleep', 'Recent family conflict'],
      risk_level: 'high',
      main_risk: ['Repeated hopelessness', 'Isolation'],
      best_communication_approach: [
        'Use gentle questions',
        'Avoid starting with grades',
        'Provide emotional validation first',
      ],
      latest_change: 'Sleep difficulty worsened after latest AI chat',
    },
    aiSessions: [
      {
        id: 'mock-ai-1',
        session_date: '2026-06-08',
        ai_summary: 'Alex expressed exam stress and conflict at home. Mood check-in: Stressed.',
        risk_level: 'high',
        mood_check_in: 'Stressed',
        type: 'ai',
      },
      {
        id: 'mock-ai-2',
        session_date: '2026-06-05',
        ai_summary: 'Alex talked about drawing as a coping method. Mood improved slightly.',
        risk_level: 'medium',
        mood_check_in: 'Okay',
        type: 'ai',
      },
    ],
    offlineSessions: [
      {
        id: 'mock-offline-1',
        session_date: '2026-06-03',
        ai_summary: 'In-person session focused on family communication strategies.',
        risk_level: 'medium',
        transcript: 'Staff: How have things been at home?\nAlex: Not great. Mum and I keep arguing.',
        emotion_analysis: ['Frustrated', 'Sad', 'Guarded'],
        categories: ['Family', 'Communication'],
        suggested_follow_up: 'Follow up on sleep routine within 48 hours.',
        type: 'offline',
      },
    ],
  },
  {
    id: 'mock-youth-2',
    name: 'Sam',
    riskLevel: 'medium',
    hasNew: false,
    currentChallenges: ['Social anxiety'],
    aiSummary: 'Sam reports mild anxiety before group activities but uses breathing exercises.',
    questionnaire: {
      interests: ['Reading', 'Walking'],
      personality: ['Thoughtful', 'Quiet'],
      preferred_communication_style: ['Needs time to warm up', 'Prefers written check-ins'],
      living_arrangement: 'Living with both parents',
      current_challenges: ['Social anxiety'],
      coping_methods: ['Breathing exercises', 'Journaling'],
    },
    insights: {
      current_state: ['Anxious before social events', 'Generally stable at home'],
      risk_level: 'medium',
      main_risk: ['Social withdrawal'],
      best_communication_approach: ['Allow pauses', 'Use calm tone', 'Validate effort over outcomes'],
      latest_change: 'Exam stress reduced after practice sessions',
    },
    aiSessions: [],
    offlineSessions: [],
  },
  {
    id: 'mock-youth-3',
    name: 'Taylor',
    riskLevel: 'low',
    hasNew: false,
    currentChallenges: ['Time management'],
    aiSummary: 'Taylor is managing well with structured routines and peer support.',
    questionnaire: {
      interests: ['Sports', 'Music'],
      personality: ['Outgoing', 'Optimistic'],
      preferred_communication_style: ['Direct and friendly', 'Appreciates humour'],
      living_arrangement: 'Living with father',
      current_challenges: ['Time management'],
      coping_methods: ['Exercise', 'Talking to friends'],
    },
    insights: {
      current_state: ['Stable mood', 'Good sleep', 'Active in sports'],
      risk_level: 'low',
      main_risk: ['Mild academic pressure'],
      best_communication_approach: ['Celebrate wins', 'Offer practical planning support'],
      latest_change: 'Family relationship improving',
    },
    aiSessions: [],
    offlineSessions: [],
  },
]

export const MOCK_PENDING_YOUTH = [
  {
    id: 'mock-youth-4',
    name: 'Riley',
    riskLevel: 'medium',
    currentChallenges: ['Sleep problems', 'Exam stress'],
    aiSummary: 'Riley completed onboarding. AI chats mention trouble sleeping before exams.',
    questionnaire: {
      interests: ['Art', 'Podcasts'],
      personality: ['Reflective', 'Sensitive'],
      preferred_communication_style: ['Gentle pacing', 'Open-ended questions'],
      living_arrangement: 'Living with guardian',
      current_challenges: ['Sleep problems', 'Exam stress'],
      coping_methods: ['Art', 'Podcasts'],
    },
    insights: {
      current_state: ['Tired', 'Worried about exams'],
      risk_level: 'medium',
      main_risk: ['Sleep disruption'],
      best_communication_approach: ['Start with wellbeing check', 'Avoid pressure about grades'],
      latest_change: 'New youth awaiting assignment',
    },
    aiSessions: [
      {
        id: 'mock-ai-3',
        session_date: '2026-06-09',
        ai_summary: 'Riley mentioned poor sleep and exam worry.',
        risk_level: 'medium',
        mood_check_in: 'Stressed',
        type: 'ai',
      },
    ],
    offlineSessions: [],
  },
]

export function sortByRisk(youthList) {
  return [...youthList].sort(
    (a, b) => (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9),
  )
}

export function getMockDashboard(staffProfile = null) {
  return {
    staff: staffProfile || { display_name: '', email: '' },
    assigned: [],
    pending: [],
    usingMock: true,
  }
}

export function getMockYouthDetail(youthId) {
  const all = [...MOCK_ASSIGNED_YOUTH, ...MOCK_PENDING_YOUTH]
  const youth = all.find((item) => item.id === youthId)
  if (!youth) return null
  return { ...youth, usingMock: true }
}
