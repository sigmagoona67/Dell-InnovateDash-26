import { readFileSync, writeFileSync } from 'node:fs'

const promptFile = readFileSync(new URL('../src/lib/atAGlancePrompt.js', import.meta.url), 'utf8')
const match = promptFile.match(/export const AT_A_GLANCE_PROMPT = `([\s\S]*?)`/)
if (!match) throw new Error('AT_A_GLANCE_PROMPT not found in atAGlancePrompt.js')

const promptBody = match[1]
const block = `// Locked: src/lib/atAGlancePrompt.js (carebridge-at-a-glance-generation-system-final)\nconst AT_A_GLANCE_PROMPT = \`${promptBody}\``

for (const file of ['functions/youth-ai-chat.ts', 'functions/staff-ai-assist.ts']) {
  const path = new URL(`../${file}`, import.meta.url)
  let src = readFileSync(path, 'utf8')
  const replaced = src.replace(
    /\/\/ (?:CareBridge At a Glance|Locked: src\/lib\/atAGlancePrompt)[\s\S]*?const AT_A_GLANCE_PROMPT = `[\s\S]*?`\n/,
    `${block}\n`,
  )
  if (replaced === src) throw new Error(`Could not replace AT_A_GLANCE_PROMPT in ${file}`)
  writeFileSync(path, replaced)
  console.log(`synced ${file}`)
}
