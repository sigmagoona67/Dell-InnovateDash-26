import { SESSION_SUMMARY_JSON_SCHEMA_PROMPT } from './aiContentStubs.js'

export const SESSION_CASE_NOTE_PROMPT = SESSION_SUMMARY_JSON_SCHEMA_PROMPT

export const BANNED_SESSION_NOTE_PATTERNS = []

export function hasBannedSessionNotePhrase() {
  return false
}
