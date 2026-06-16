export const MOODS = [
  { id: 'good', emoji: '😊', label: 'Good' },
  { id: 'okay', emoji: '🙂', label: 'Okay' },
  { id: 'sad', emoji: '😔', label: 'Sad' },
  { id: 'stressed', emoji: '😣', label: 'Stressed' },
  { id: 'overwhelmed', emoji: '😢', label: 'Overwhelmed' },
]

export const ONBOARDING_SECTIONS = [
  {
    id: 'interests',
    title: 'Interests',
    subtitle: 'What do you enjoy doing in your free time?',
    type: 'multiple',
    options: ['Music', 'Gaming', 'Drawing', 'Sports', 'Anime', 'K-pop', 'Reading', 'Coding', 'Pets', 'Others'],
  },
  {
    id: 'personality',
    title: 'Personality',
    subtitle: 'Which words describe you best?',
    type: 'multiple',
    options: ['Introverted', 'Outgoing', 'Sensitive', 'Calm', 'Funny', 'Creative', 'Emotional', 'Independent', 'Optimistic', 'Others'],
  },
  {
    id: 'communication',
    title: 'Preferred Communication Style',
    subtitle: 'What kind of support feels most helpful to you?',
    type: 'multiple',
    options: [
      'Patient',
      'Gentle',
      'Good listener',
      'Positive',
      'Funny',
      'Gives practical advice',
      'Gives emotional support',
      'Similar hobbies',
      'Others',
    ],
  },
  {
    id: 'living',
    title: 'Family Situation',
    subtitle: 'Living Arrangement',
    type: 'single',
    options: [
      'Living with both parents',
      'Living with one parent',
      'Living with grandparents',
      'Living with relatives',
      'Others',
    ],
  },
  {
    id: 'challenges',
    title: 'Current Challenges',
    subtitle: 'What are you going through right now?',
    type: 'multiple',
    options: [
      'Family conflict',
      'School stress',
      'Exams',
      'Friendship issues',
      'Bullying',
      'Anxiety',
      'Feeling lonely',
      'Sleep problems',
      'Low self-esteem',
      'Relationship problems',
      'Financial issues',
      'Others',
    ],
  },
  {
    id: 'coping',
    title: 'Coping Methods',
    subtitle: 'What helps you when things feel difficult?',
    type: 'multiple',
    options: [
      'Listen to music',
      'Play games',
      'Exercise',
      'Draw',
      'Sleep',
      'Talk to friends',
      'Talk to family',
      'Be alone',
      'Watch movies',
      'Go outside',
      'Others',
    ],
  },
]

export const GREETING_TEMPLATES = [
  (name) => `Hi ${name}, I'm here with you tonight.`,
  (name) => `I'm glad you're here today, ${name}. How has your day been?`,
  (name) => `It's nice to see you again, ${name}. Would you like to talk about today?`,
  (name) => `Hey ${name}, this is a safe space. I'm listening whenever you're ready.`,
  (name) => `Welcome back, ${name}. Take your time — there's no rush here.`,
  (name) => `${name}, I'm glad you checked in. What's on your mind?`,
]

export const ASSIGNED_WORKER = {
  name: 'Ms Tan',
  status: 'Offline',
  workingHours: '9AM - 6PM',
  lastFollowUp: '8 June 2026',
  nextFollowUp: 'Within 24 hours',
  message:
    'Your AI conversation summary will be shared with Ms Tan to provide continuous support.',
}

/** Dates with conversations in June 2026 (day of month) */
export const CHAT_HISTORY_DATES = [3, 8, 10, 15, 22, 28]

export const CHAT_HISTORY_BY_DATE = {
  3: {
    original: [
      { role: 'ai', text: "Hi Alex, I'm here with you tonight. How are you feeling?" },
      { role: 'user', text: 'A bit tired from school.' },
      { role: 'ai', text: "That sounds like a long day. Would you like to tell me what made it tiring?" },
      { role: 'user', text: "We had two tests and I didn't sleep well." },
      { role: 'ai', text: "Tests plus poor sleep can feel overwhelming. You showed up anyway — that takes strength." },
    ],
    summary:
      'Alex reported feeling tired due to two school tests and lack of sleep. AI validated their effort and encouraged rest.',
  },
  8: {
    original: [
      { role: 'ai', text: "Welcome back, Alex. What's on your mind today?" },
      { role: 'user', text: 'Had a small argument with a friend.' },
      { role: 'ai', text: 'Friendship conflicts can hurt. Would you like to share what happened?' },
      { role: 'user', text: 'They cancelled plans last minute again.' },
      { role: 'ai', text: "It's okay to feel disappointed. Your feelings are valid." },
    ],
    summary:
      'Alex felt hurt after a friend cancelled plans. AI provided emotional validation and a supportive listening space.',
  },
  10: {
    original: [
      { role: 'ai', text: "Hi Alex, I'm glad you're here today. How has your day been?" },
      { role: 'user', text: 'Better than yesterday 🙂' },
      { role: 'ai', text: "That's wonderful to hear. What helped today feel better?" },
    ],
    summary: 'Alex reported an improved mood compared to the previous day. AI explored positive factors.',
  },
  15: {
    original: [
      { role: 'ai', text: "Hey Alex, this is a safe space. I'm listening whenever you're ready." },
      { role: 'user', text: 'Feeling stressed about exams next week.' },
      { role: 'ai', text: 'Exam stress is very common. Would breaking study into small steps help?' },
    ],
    summary: 'Alex expressed exam-related stress. AI offered gentle coping suggestions.',
  },
  22: {
    original: [
      { role: 'ai', text: "It's nice to see you again, Alex. Would you like to talk about today?" },
      { role: 'user', text: 'Just wanted to check in.' },
      { role: 'ai', text: "I'm glad you did. Checking in is a healthy habit." },
    ],
    summary: 'Brief wellness check-in. Alex proactively reached out for connection.',
  },
  28: {
    original: [
      { role: 'ai', text: "Hi Alex, I'm here with you tonight." },
      { role: 'user', text: 'Feeling a bit lonely.' },
      { role: 'ai', text: "Thank you for sharing that. You're not alone — I'm here with you." },
    ],
    summary: 'Alex shared feelings of loneliness. AI provided warm reassurance and presence.',
  },
}

export function pickRandomGreeting(name) {
  const template = GREETING_TEMPLATES[Math.floor(Math.random() * GREETING_TEMPLATES.length)]
  return template(name)
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}
