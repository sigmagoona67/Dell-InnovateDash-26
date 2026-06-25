/** Locked youth AI Companion reply templates (v2026-06-10 — image-2 quality). */

export const YOUTH_CHAT_REPLY_VERSION = 'youth-chat-reply-v2026-06-10'

export const MOOD_REPLY_SAD =
  "I'm sorry to hear that you're feeling sad today. It's okay to have those feelings, and it's important to acknowledge them. If you'd like to share more about what's been making you feel this way, I'm here to listen. • Sometimes writing down your thoughts can help clarify what's on your mind • Music or drawing can be a soothing way to express feelings • If there's something specific that's weighing on you, talking it through might help lighten the load • Remember that it's okay to seek comfort in small things you enjoy. Is there anything in particular that's been bothering you or something that could make you feel a bit better today?"

export const MOOD_REPLIES = {
  Good: "I'm glad to hear you're feeling good today. What's been going well for you?",
  Okay:
    "Thank you for checking in. I'm here with you — would you like to talk about your day? • A short walk or a favourite snack can sometimes help you settle • If something is on your mind, you can share as much or as little as you like. What would feel most helpful to talk about right now?",
  Sad: MOOD_REPLY_SAD,
  Stressed:
    "Thank you for sharing that — it sounds like today may feel heavy, and that matters. I'm here with you. • Try naming one thing that feels most stressful right now — sometimes that alone helps • A few slow breaths or stepping away for five minutes can take the edge off • Small comforts you enjoy are allowed, even on hard days • You do not have to solve everything tonight. What part of today felt heaviest?",
  Overwhelmed:
    "That sounds really tough. Thank you for trusting me with how you feel — we can take this one step at a time, and I'm here with you. • Focus on the very next small step, not the whole problem • Let yourself pause before responding to what feels overwhelming • Tell a trusted adult or your youth worker if things are piling up • Rest and hydration matter more than you might think when you are overloaded. What feels most overwhelming right now?",
}

export function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function needsRichYouthReply(message) {
  const text = String(message || '').trim()
  if (wordCount(text) >= 40) return true
  return /only .+ make(s)? me feel|feel better|hitting|hit me|beating|scold|yell|abuse|bully|suicide|self.?harm|崩溃|打|骂|欺负|跟踪|想自杀|sad|stress|stressed|overwhelm|anxious|irritat|school|bad day|feelings|misunderstood|noise|click|sensory|pen|parent|family|lonely|withdraw/i.test(
    text,
  )
}

export function isGenericShortYouthReply(reply) {
  const text = String(reply || '').trim()
  if (!text) return true
  if (/what'?s been weighing on you|you can take your time, and i'?ll listen|would you like to talk about what'?s on your mind\?$/i.test(text) && !/•/.test(text)) {
    return true
  }
  return false
}

export function isYouthReplyTooShort(message, reply) {
  const text = String(reply || '').trim()
  if (!text || isGenericShortYouthReply(text)) return true
  const rich = needsRichYouthReply(message)
  if (!rich) return text.length < 80
  const isEnglish = !/[\u4e00-\u9fff]/.test(message)
  if (isEnglish) return text.length < 200 || !/•/.test(text)
  return text.length < 100 || !/•/.test(text)
}

function snippetReflect(message, maxWords = 18) {
  const words = String(message || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
  if (!words.length) return 'what you shared'
  const slice = words.slice(0, maxWords).join(' ')
  return `${slice}${words.length > maxWords ? '…' : ''}`
}

export function buildRichEnglishEmotionalFallback(message) {
  const text = String(message || '').trim()
  const heard = snippetReflect(text)

  if (/school|class|teacher|exam|homework|pen|click|noise|sensory|irritat|anxious|misunderstood|parent|sensitive/i.test(text)) {
    return `Hearing you describe ${heard}, I'm really glad you told me — it sounds like today asked a lot of your senses and your patience.

• Stepping somewhere quieter, even briefly, can help your body settle after loud or irritating moments
• The routines you mentioned — like caring for pens, writing, or reading online — sound like thoughtful ways you regulate when the world feels too loud
• Wanting others to understand you are not trying to be difficult is completely fair — you are trying to cope
• If adults at home feel dismissive, you do not have to explain every sensitivity alone; your youth worker can help bridge that gap

Feeling irritated and sad at the same time makes sense after a day like this. What part felt heaviest — school, home, or both?`
  }

  return `I'm sorry to hear that you're going through this. It's okay to have these feelings, and it matters that you told me. Hearing you mention ${heard}, I can tell today has not felt easy.

• Sometimes writing down your thoughts can help clarify what is on your mind
• Music, drawing, or a quiet ritual you enjoy can be a soothing way to express feelings
• If something specific is weighing on you, talking it through might help lighten the load
• Remember that it is okay to seek comfort in small things you enjoy — they are not silly

Is there anything in particular that has been bothering you, or something that could make you feel a bit better tonight?`
}

export function normalizeYouthCasualText(message = '') {
  return String(message || '')
    .trim()
    .replace(/^ilike\b/i, 'i like')
    .replace(/^ilove\b/i, 'i love')
    .replace(/^ienjoy\b/i, 'i enjoy')
}

export function isCasualPositiveMessage(message = '') {
  const raw = String(message || '').trim()
  if (!raw || raw.length > 120) return false
  if (/^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i.test(raw)) return false
  if (
    /想自杀|自杀|自伤|hurt myself|suicide|kill myself|abuse|bully|hit me|打|骂|欺负|only .+ make(s)? me feel/i.test(
      raw,
    )
  ) {
    return false
  }
  const text = normalizeYouthCasualText(raw)
  return (
    /\b(i'?m\s+)?(really\s+)?(into|like|love|enjoy|prefer)\b/i.test(text) ||
    /^我很喜欢|我喜欢|我超喜欢|我爱/.test(raw)
  )
}

export function buildCasualPositiveFallback(message) {
  const raw = String(message || '').trim()
  const text = normalizeYouthCasualText(raw)
  const heard = snippetReflect(text, 12)
  if (/[\u4e00-\u9fff]/.test(raw)) {
    return `谢谢你愿意跟我分享这个，听起来「${heard}」对你来说是一件很温暖的小事。 • 把这些让你开心的小事记下来，心情不好时可以翻看 • 如果愿意，可以多说说你喜欢它的哪一点 • 享受这些小快乐是没问题的，不用觉得不好意思。你今天还想多聊聊吗？`
  }
  if (/piano|guitar|violin|drums|music|sing/i.test(text)) {
    return `I'm glad you mentioned music — it sounds like ${heard} matters to you. • Playing or listening can be a real way to settle when the day feels heavy • You could notice what you enjoy most: the sound, the rhythm, or how it feels in your hands • Small creative rituals like this are worth keeping. What do you like most about it?`
  }
  if (/cookie|snack|food|eat|pizza|cake/i.test(text)) {
    return `I'm glad you shared that — it sounds like ${heard} is a small comfort that feels good to you. • Enjoying simple treats is completely okay, especially on harder days • You could notice what you like about it — taste, warmth, or a familiar ritual • Little pleasures like this can be gentle anchors. What is your favourite part about it?`
  }
  return `I'm glad you shared that — it sounds like ${heard} is something that brings you a little comfort or joy. • Small likes such as food, hobbies, or routines can be real anchors on harder days • If you want, tell me what you enjoy most about it — taste, smell, memory, or ritual • It's completely okay to lean on simple things that feel good. What is it about that you like best?`
}

export function buildQuickFallbackReply(message) {
  const text = String(message || '').trim()
  const isChinese = /[\u4e00-\u9fff]/.test(text)
  const moodMatch = text.match(/^i'm feeling (good|okay|sad|stressed|overwhelmed) today\.?$/i)

  if (/想自杀|自杀|不想活|自伤|hurt myself|suicide|kill myself/i.test(text)) {
    if (isChinese) {
      return `听到你说这些，我真的很心疼你，也很担心你的安全。你现在安全吗？身边有没有人可以陪着你？ • 马上联系你信任的大人、老师或社工 • 如果觉得自己可能马上伤害自己，请立刻联系紧急服务 • 深呼吸几次，让自己稍微缓一缓。你愿意告诉我，今晚是什么让你特别难受吗？`
    }
    return `Hearing you mention suicidal thoughts, I'm really worried about you — and I'm glad you told someone. Are you safe right now? Is anyone with you? • Reach out to a trusted adult, teacher, or your youth worker tonight • Call a local crisis line if you need someone to stay with you on the phone • If you might hurt yourself soon, contact emergency services right away. What feels hardest for you tonight?`
  }

  if (isChinese) {
    return `谢谢你愿意跟我说这些，我在这里陪你。今晚有什么压在你心上吗？你可以慢慢说，我会认真听。 • 写下几个关键词，有时能让思绪清楚一点 • 做一件让你感到安静的小事，比如听音乐或画画 • 如果很难受，可以联系信任的大人或社工。`
  }

  if (needsRichYouthReply(text)) {
    return buildRichEnglishEmotionalFallback(text)
  }

  if (moodMatch) {
    const moodKey = moodMatch[1].charAt(0).toUpperCase() + moodMatch[1].slice(1).toLowerCase()
    if (MOOD_REPLIES[moodKey]) return MOOD_REPLIES[moodKey]
  }

  if (isCasualPositiveMessage(text)) {
    return buildCasualPositiveFallback(text)
  }

  return MOOD_REPLY_SAD
}
