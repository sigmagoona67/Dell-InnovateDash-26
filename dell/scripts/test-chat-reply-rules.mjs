// Chat flow: ChatGPT first, fallback only on API failure.
// Format/length rules live in buildChatSystemPrompt in youth-ai-chat.ts

const FORMAT_RULES = {
  lightMinChars: 80,
  seriousMinChars: 200,
  seriousMaxChars: 450,
  structure: ['reflect exact words', 'safety check', 'bullet suggestions', 'normalise', 'follow-up question'],
}

console.log('Chat strategy: ChatGPT direct call with fixed format/length prompt')
console.log('Fallback: only when API fails or reply < 20 chars')
console.log('Format rules:', FORMAT_RULES)
console.log('OK')
