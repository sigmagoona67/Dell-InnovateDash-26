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

export function calculateAgeFromDob(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}
