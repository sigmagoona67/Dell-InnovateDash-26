export const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

export const WORKER_GENDER_PREFS = ['No Preference', 'Male', 'Female']

export const WORKER_AGE_PREFS = ['No Preference', '20–30', '30–40', '40+']

export const COMMON_LANGUAGES = [
  'English',
  'Mandarin',
  'Malay',
  'Tamil',
  'Cantonese',
  'Hokkien',
  'Hindi',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'Arabic',
  'Tagalog',
  'Indonesian',
  'Thai',
  'Vietnamese',
  'Bengali',
  'Portuguese',
  'German',
  'Other',
]

export const COUNTRIES = [
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Philippines',
  'Thailand',
  'Vietnam',
  'India',
  'China',
  'Hong Kong',
  'Taiwan',
  'Japan',
  'South Korea',
  'Australia',
  'New Zealand',
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'United Arab Emirates',
  'Other',
]

export const YOUTH_QUALITIES = [
  'Listens without interrupting',
  'Gives emotional support',
  'Gives practical advice',
  'Checks in regularly',
  'Encourages me',
  'Challenges me to improve',
  'Makes me laugh',
  'Talks gently',
  'Is calm under pressure',
  'Is patient',
  'Gives honest feedback',
  'Respects my privacy',
  "Doesn't judge me",
  'Helps me express my feelings',
  'Understands when I need space',
  'Gives step-by-step guidance',
  'Is proactive',
  'Shares personal experiences',
  'Celebrates my small achievements',
  'Other',
]

export const STAFF_QUALITIES = [
  'Listens without interrupting',
  'Provides emotional support',
  'Gives practical advice',
  'Checks in regularly',
  'Encourages youths',
  'Challenges youths to improve',
  'Makes youths laugh',
  'Talks gently',
  'Is calm under pressure',
  'Is patient',
  'Gives honest feedback',
  "Respects youths' privacy",
  "Doesn't judge youths",
  'Helps youths express feelings',
  'Understands when youths need space',
  'Gives step-by-step guidance',
  'Is proactive',
  'Shares personal experiences',
  'Celebrates youths\' small achievements',
  'Other',
]

export const INTEREST_CATEGORIES = {
  Gaming: ['Mobile Games', 'PC Games', 'Console Games', 'Roblox', 'Minecraft', 'Valorant', 'Genshin Impact'],
  Technology: ['Coding', 'AI', 'Robotics', 'Electronics', 'App Development', 'Video Editing', 'Web Design'],
  Music: ['Pop', 'K-pop', 'Rap', 'Classical', 'Playing Instruments', 'Singing'],
  Sports: ['Football', 'Basketball', 'Badminton', 'Swimming', 'Running', 'Gym'],
  'Creative Arts': ['Drawing', 'Photography', 'Painting', 'Animation', 'Writing', 'Design'],
  Entertainment: ['Anime', 'Movies', 'TV Shows', 'YouTube', 'Podcasts', 'Comics'],
  Lifestyle: ['Fashion', 'Cooking', 'Baking', 'Pets', 'Travel', 'Beauty'],
  Learning: ['Science', 'Math', 'Reading', 'Business', 'Entrepreneurship', 'Language Learning'],
}

/** Mental Health includes high-risk labels without a separate header. */
export const CHALLENGE_CATEGORIES = [
  {
    label: 'Family',
    items: ['Family conflict', 'Parents arguing', 'Divorce', 'Financial stress'],
  },
  {
    label: 'School',
    items: ['Exams', 'Academic stress', 'Low motivation', 'Attendance'],
  },
  {
    label: 'Friends',
    items: ['Bullying', 'Friendship issues', 'Relationship issues', 'Social anxiety'],
  },
  {
    label: 'Mental Health',
    items: [
      'Anxiety',
      'Stress',
      'Loneliness',
      'Low self-esteem',
      'Anger',
      'Depression',
      'Self-harm thoughts',
      'Suicide thoughts',
      'Abuse',
      'Substance use',
    ],
  },
  {
    label: 'Future',
    items: ['Career', 'University', 'Confidence', 'Goal setting'],
  },
]

/** Normalize DB/API date values to YYYY-MM-DD for forms and age calculation. */
export function normalizeIsoDate(value) {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  if (!raw) return ''

  const datePart = raw.split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function calculateAgeFromDob(dob) {
  const normalized = normalizeIsoDate(dob)
  if (!normalized) return null
  const parts = normalized.split('-').map(Number)
  if (parts.length !== 3) return null
  const [year, month, day] = parts
  const birth = new Date(year, month - 1, day)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

/** Latest date of birth allowed for someone at least `minAge` years old today. */
export function maxDateOfBirthForMinAge(minAge) {
  const today = new Date()
  return new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate())
}

export function isDobAtLeastMinAge(dob, minAge) {
  if (minAge == null) return true
  if (!dob) return false
  const age = calculateAgeFromDob(dob)
  return age != null && age >= minAge
}
