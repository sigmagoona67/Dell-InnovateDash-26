import { PERSONALITY_SCALES } from './youthMockData'

export { PERSONALITY_SCALES }

export const STAFF_QUIZ_SECTIONS = [
  {
    id: 'interests',
    title: 'Connection Interests',
    subtitle: 'What topics or hobbies help you connect with young people?',
    type: 'ai_tags',
    aiCategory: 'staff_interests',
    placeholder: 'e.g. sports, music, gaming, art, study skills…',
    hint: 'Type what you enjoy or know well, then tap Show options. Select tags that reflect how you connect with youth.',
  },
  {
    id: 'personality',
    title: 'Your Personality',
    subtitle: 'Where do you fall on each spectrum as a youth worker?',
    type: 'scales',
  },
  {
    id: 'communication',
    title: 'Communication Approach',
    subtitle: 'How do you prefer to communicate and support youths?',
    type: 'ai_tags',
    aiCategory: 'staff_communication',
    placeholder: 'e.g. gentle listener, direct advice, humour, structured check-ins…',
    hint: 'Describe your style. Select suggested options or type more to refine.',
  },
  {
    id: 'strengths',
    title: 'Supporting Strengths',
    subtitle: 'What are you especially good at when supporting young people?',
    type: 'ai_tags',
    aiCategory: 'staff_strengths',
    placeholder: 'e.g. emotional validation, crisis de-escalation, academic coaching…',
    hint: 'Type your strengths and pick the options that best describe you.',
  },
  {
    id: 'notes',
    title: 'Additional Notes',
    subtitle: 'Anything else that helps match you with the right youth?',
    type: 'textarea',
  },
]
