// Seeded demo caseload for The Quiet Signal.
//
// These are crafted message/session histories — NOT hardcoded scores. They are
// fed through the same deterministic scorer (quietSignal.js) the real pipeline
// would use, so the demo is reproducible and proves the maths, not a mock-up.
//
//  - Maya   -> AMBER  : reads "fine" on the surface, but language curdles and she
//                       withdraws. Her explicit per-message risk stays LOW.
//  - Daniel -> WATCH  : a milder, earlier drift.
//  - Priya  -> STEADY : a healthy control. Proves the signal does NOT cry wolf
//                       (she is filtered out and never surfaces to the worker).

const DAY_MS = 24 * 60 * 60 * 1000

function at(now, daysAgo, hour = 22, minute = 0) {
  const d = new Date(now)
  d.setHours(hour, minute, 0, 0)
  return new Date(d.getTime() - daysAgo * DAY_MS).toISOString()
}

function dateOnly(now, daysAgo) {
  const d = new Date(now)
  d.setHours(12, 0, 0, 0)
  d.setTime(d.getTime() - daysAgo * DAY_MS)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}` // local calendar day, matches scorer's dayKey
}

// Helper: build a youth's data from a per-day script.
// script: [{ daysAgo, mood, youth?, ai? }]  (youth/ai are message strings; omit youth to model "opened, didn't write")
function build(script, now) {
  const messages = []
  const sessions = []
  for (const day of script) {
    if (day.mood) sessions.push({ session_date: dateOnly(now, day.daysAgo), mood_check_in: day.mood })
    if (day.ai) messages.push({ sender: 'ai', message: day.ai, created_at: at(now, day.daysAgo, 22, 1) })
    if (day.youth) messages.push({ sender: 'youth', message: day.youth, created_at: at(now, day.daysAgo, 22, 3) })
  }
  return { messages, sessions }
}

export function buildQuietSignalCaseload(now = new Date()) {
  const maya = build([
    { daysAgo: 13, mood: 'Good', ai: 'How was today?', youth: 'Today was actually pretty good, I went to the basketball court with a couple of friends after class and we just hung out and talked for ages.' },
    { daysAgo: 12, mood: 'Okay', ai: 'Glad to hear it. Anything on your mind?', youth: 'Not really, just a normal day. We had a maths test but I think I did okay on it, I revised a fair bit last night.' },
    { daysAgo: 11, mood: 'Okay', ai: 'Sounds steady.', youth: 'Yeah it was fine, watched a film with my sister in the evening and we ordered food, it was nice to relax for a bit.' },
    { daysAgo: 9, mood: 'Sad', ai: 'How are you feeling tonight?', youth: 'I dunno, today felt kind of off and I got into a small argument with a friend but it is probably nothing.' },
    { daysAgo: 7, mood: 'Sad', ai: 'That sounds tough. Want to talk about it?', youth: 'I always say the wrong thing and everyone gets annoyed with me eventually, it is just how it always goes.' },
    { daysAgo: 5, mood: 'Stressed', ai: 'I hear you. I am here with you.', youth: 'Nothing ever really changes for me, I am completely useless at all of this and I never get anything right.' },
    { daysAgo: 4, mood: 'Stressed', ai: 'You are not useless. What is weighing on you?', youth: 'whatever. i am just so tired of everything.' },
    { daysAgo: 3, mood: 'Overwhelmed', ai: 'I am still here, no pressure to talk.', youth: 'fine' },
    { daysAgo: 1, mood: 'Overwhelmed', ai: 'Thinking of you tonight.' }, // opened, didn't write
    { daysAgo: 0, mood: 'Overwhelmed', ai: 'I am here whenever you want.' }, // opened, didn't write
  ], now)

  const daniel = build([
    { daysAgo: 12, mood: 'Good', ai: 'Evening, how was your day?', youth: 'Pretty good day overall, football practice went well and I caught up with some mates afterwards which was nice.' },
    { daysAgo: 10, mood: 'Okay', ai: 'Nice. How is everything else?', youth: 'A bit of a tiring day with all the schoolwork, but I am getting through it alright and keeping on top of things.' },
    { daysAgo: 8, mood: 'Okay', ai: 'Sounds steady.', youth: 'Nothing much today, just classes and homework, feeling okay enough I suppose.' },
    { daysAgo: 6, mood: 'Okay', ai: 'How are you tonight?', youth: 'kind of a flat day honestly, not bad just a bit meh' },
    { daysAgo: 4, mood: 'Sad', ai: 'Thanks for sharing that.', youth: 'feeling a little low today, not totally sure why' },
    { daysAgo: 2, mood: 'Okay', ai: 'Here if you need me.', youth: 'bit better today thanks' },
  ], now)

  const priya = build([
    { daysAgo: 13, mood: 'Okay', ai: 'Hi, how was today?', youth: 'It was alright, a bit of a slow day but I finished my art project which I am quite proud of actually.' },
    { daysAgo: 11, mood: 'Good', ai: 'That is lovely.', youth: 'Thanks! I might enter it into the school showcase, my teacher said it was some of my best work so far.' },
    { daysAgo: 9, mood: 'Okay', ai: 'How are things this week?', youth: 'Pretty normal, hung out with friends at the weekend and we are planning a trip to the museum next month.' },
    { daysAgo: 6, mood: 'Good', ai: 'Sounds fun.', youth: 'It should be, I have been looking forward to it. Today was calm, just revised a little and went for a walk.' },
    { daysAgo: 3, mood: 'Okay', ai: 'How was today?', youth: 'Good thanks, a normal school day, nothing much to report but I feel okay and rested.' },
    { daysAgo: 1, mood: 'Good', ai: 'Glad to hear it.', youth: 'Yeah, looking forward to the weekend, planning to see family and maybe catch a film.' },
  ], now)

  return [
    { id: 'qs-demo-maya', name: 'Maya T.', explicitRisk: 'low', ...maya },
    { id: 'qs-demo-daniel', name: 'Daniel K.', explicitRisk: 'low', ...daniel },
    { id: 'qs-demo-priya', name: 'Priya R.', explicitRisk: 'low', ...priya },
  ]
}
