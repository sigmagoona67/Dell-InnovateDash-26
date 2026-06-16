const MOOD_CHECKIN_LINE = /^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i

export function normalizeSessionNote(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function sentenceCount(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12).length
}

const BANNED_SESSION_NOTE_PATTERNS = [
  /\bthe youth discussed\b/i,
  /\bthe youth shared\b/i,
  /\bthe youth reported\b/i,
  /\bthe youth said\b/i,
  /\bthe latest session\b/i,
  /\brecent records indicate\b/i,
  /\bthe conversation focused on\b/i,
  /\bcontinued monitoring is recommended\b/i,
  /\bpersistent concerns around\b/i,
]

export function isSessionNoteQuality(text) {
  const value = normalizeSessionNote(text)
  if (!value) return false
  if (/[\u4e00-\u9fff]/.test(value)) return false
  if (wordCount(value) < 55) return false
  if (wordCount(value) > 130) return false
  if (sentenceCount(value) < 2) return false
  if (BANNED_SESSION_NOTE_PATTERNS.some((p) => p.test(value))) return false
  return true
}

function isYouthNameOnly(text) {
  return /^[A-Za-z][A-Za-z0-9_-]{1,24}$/.test(String(text || '').trim())
}

function expandYouthChunks(chunks) {
  const out = []
  for (const chunk of chunks) {
    const pieces = String(chunk || '').split(/(?<=[.!?])\s+(?=(?:The youth|They)\b)/i)
    for (const piece of pieces) {
      const line = piece.trim().replace(/\s+/g, ' ')
      if (!line || line.length < 12) continue
      if (/^Staff\b/i.test(line)) continue
      out.push(line)
    }
  }
  return [...new Set(out)]
}

/** Pull youth speech from messages or transcript. */
export function extractYouthSpeech(transcript = '') {
  const text = String(transcript || '').trim()
  if (!text) return []

  const parts = []

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    const tagged = line.match(/^(?:Youth|YOUTH|Client|Student|youth)\s*[:\-]\s*(.+)$/i)
    if (tagged?.[1]) {
      const content = tagged[1].trim()
      if (!isYouthNameOnly(content)) parts.push(content)
      continue
    }

    if (/^The youth\b/i.test(line)) {
      parts.push(line.trim())
    }
  }

  const youthBlock = text.match(/YOUTH SHARING([\s\S]*?)(?=DISCUSSION TOPICS|SAFETY|STAFF|AGREEMENT|PLANNED|$)/i)
  if (youthBlock?.[1]) {
    for (const para of youthBlock[1].split(/\n+/)) {
      const chunk = para.trim()
      if (chunk.length > 15 && !/^YOUTH/i.test(chunk) && !/^Staff\b/i.test(chunk)) parts.push(chunk)
    }
  }

  return expandYouthChunks([...new Set(parts.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean))])
}

function moodPresentation(moodCheckIn, corpus) {
  if (moodCheckIn) {
    const mood = String(moodCheckIn).toLowerCase()
    if (mood === 'good' || mood === 'okay') {
      return 'Presentation on contact appears settled, though underlying strain may still be present'
    }
    if (mood === 'sad') return 'Presentation on contact appears subdued and low in mood'
    if (mood === 'stressed' || mood === 'overwhelmed') {
      return 'Presentation on contact appears tense and emotionally loaded'
    }
    return `Presentation on contact appears ${mood}`
  }
  if (/sad|unhappy|low mood|depress/i.test(corpus)) {
    return 'Emotional presentation appears lowered and somewhat withdrawn'
  }
  if (/stress|overwhelm|anxious|worry|panic/i.test(corpus)) {
    return 'Emotional presentation suggests heightened anxiety and internal pressure'
  }
  return 'Emotional presentation appears guarded yet willing to engage when approached calmly'
}

/** Social work case impression from youth speech (AI chat session summary fallback). */
export function summarizeYouthSpeech({
  text = '',
  moodCheckIn = null,
} = {}) {
  let lines = extractYouthSpeech(text)

  if (!lines.length) {
    lines = String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !MOOD_CHECKIN_LINE.test(l) && !/^ai\s*:/i.test(l))
  }

  const corpus = lines.join(' ')
  if (!corpus.trim()) {
    return 'Limited disclosure during this contact; current presentation and difficulties could not be fully assessed.'
  }

  const opening = moodPresentation(moodCheckIn, corpus)
  const sentences = []

  if (/body image|appearance|weight|eating|meal|food|guilt.*eat/i.test(corpus)) {
    sentences.push(
      `${opening}, with preoccupation around body image, weight and eating routines emerging as a central difficulty.`,
      'Guilt after eating and skipped meals point to self-critical patterns around food, while comparison with social media imagery appears to intensify unrealistic standards and emotional distress.',
      'Enjoyment of previously valued activities seems reduced, and self-worth appears increasingly tied to appearance rather than other strengths.',
    )
  } else if (/bird|leaf|headphone|aquarium|nature|counting|collect/i.test(corpus)) {
    sentences.push(
      `${opening}, with a clear preference for quiet, solitary activities that offer sensory calm and emotional regulation.`,
      'Engagement with nature-based rituals and low-stimulation environments appears to function as a primary coping strategy when social or family demands feel overwhelming.',
      'These patterns suggest the youth is resourceful in creating private restorative space, though underlying sadness and need for solitude may reflect ongoing relational or environmental strain.',
    )
  } else if (/exam|academic|study|grade|school|homework/i.test(corpus)) {
    const extras = []
    if (/family|parent|home|disappoint/i.test(corpus)) extras.push('family expectations')
    if (/sleep|insomnia|tired|exhausted/i.test(corpus)) extras.push('disrupted sleep')
    const backdrop = extras.length ? `, compounded by ${extras.join(' and ')}` : ''
    sentences.push(
      `${opening}, with academic pressure and exam-related worry appearing to dominate mood and daily functioning${backdrop}.`,
      'Patterns of overwhelm around school demands suggest difficulty sustaining previous routines, with fatigue and irritability likely affecting concentration and recovery time.',
    )
    if (/gentle|companionship|listen/i.test(corpus)) {
      sentences.push(
        'Engagement improves when contact is gentle and listening-led, indicating directive advice may feel intrusive while stress remains high.',
      )
    } else {
      sentences.push(
        'Underlying concern appears to centre on fear of disappointing others while capacity to cope with competing demands is narrowing.',
      )
    }
  } else if (/lonely|alone|isolated|withdraw|solitude/i.test(corpus)) {
    sentences.push(
      `${opening}, with social withdrawal and loneliness shaping day-to-day routines and sense of connection.`,
      'Limited peer contact and reduced participation in outside activities suggest shrinking social confidence, leaving more time alone with ruminative thoughts.',
      'The interaction points to unmet belonging needs and a preference for low-pressure, non-judgemental contact before any problem-solving.',
    )
  } else if (/guitar|piano|music|draw|minecraft|game/i.test(corpus)) {
    sentences.push(
      `${opening}, with creative or immersive private activities emerging as a meaningful source of calm and emotional relief.`,
      'Reliance on a small set of restorative rituals before sleep or during distress suggests coping resources are present but may be narrowing as other supports feel less available.',
      'Engagement appears strongest when contact validates these comforts rather than pushing immediate problem-solving.',
    )
  } else {
    sentences.push(
      `${opening}, with several day-to-day stressors affecting mood and routine stability.`,
      'Recurring worry, disrupted sleep or reduced enjoyment of usual activities suggest coping resources are stretched, though specific triggers vary across the interaction.',
      'A calm, validating stance appears most likely to sustain engagement while underlying difficulties are explored further.',
    )
  }

  if (/gentle|companionship|listen/i.test(corpus) && !sentences.some((s) => /listening-led|listening-centred|non-judgemental/i.test(s))) {
    sentences.push('A clear preference for gentle, listening-centred contact was evident throughout the interaction.')
  }

  return sentences.join(' ')
}

export function buildOfflineSessionCaseNote() {
  return ''
}

export function buildSessionCaseNoteFromContext(args) {
  return summarizeYouthSpeech(args)
}

export function buildTranscriptSessionSummary(args) {
  return summarizeYouthSpeech(args)
}

export function pickBetterSessionSummary(aiSummary, synthesizedSummary) {
  const ai = normalizeSessionNote(aiSummary)
  const syn = normalizeSessionNote(synthesizedSummary)
  if (!ai) return syn
  if (!syn) return ai
  if (!isSessionNoteQuality(ai)) return syn
  if (!isSessionNoteQuality(syn)) return ai
  return ai
}

export function isGenericSessionSummary(text) {
  return !isSessionNoteQuality(text)
}

export function extractOfflineSummaryCorpus(transcript = '') {
  return extractYouthSpeech(transcript).join(' ')
}
