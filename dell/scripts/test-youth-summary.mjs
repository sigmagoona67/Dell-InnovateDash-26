import { readFileSync } from 'fs'
import {
  buildOfflineSessionCaseNote,
  extractYouthSpeech,
  isSessionNoteQuality,
} from '../src/lib/sessionCaseNote.js'

const transcript = readFileSync('./fixtures/demo-offline-session-transcript.txt', 'utf8')
const youth = extractYouthSpeech(transcript)
console.log('youth lines:', youth.length)
youth.forEach((l, i) => console.log(`${i + 1}. ${l.slice(0, 80)}...`))
const summary = buildOfflineSessionCaseNote({ transcript, youthName: 'lifei1' })
console.log('\n--- case impression ---\n')
console.log(summary)
console.log('\nwords:', summary.split(/\s+/).length, '| quality:', isSessionNoteQuality(summary))
