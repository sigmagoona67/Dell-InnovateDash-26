// Extract plain text from an uploaded counselling-notes file, client-side.
// .docx is parsed with mammoth (lazy-loaded so it never weighs down first paint);
// .txt/.md are read directly. The extracted text feeds the existing offline-session
// AI-summary pipeline. (Ported from the lifei branch.)
export async function extractTextFromFile(file) {
  if (!file) throw new Error('No file selected')

  const name = file.name.toLowerCase()

  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return file.text()
  }

  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    const text = result.value?.trim() || ''
    if (text.length < 30) {
      throw new Error('This Word document looks empty. Try another file, or paste the transcript instead.')
    }
    return text
  }

  if (name.endsWith('.doc')) {
    throw new Error('Legacy .doc files aren’t supported — save as .docx, or paste the transcript.')
  }
  if (name.endsWith('.pdf')) {
    throw new Error('PDF text extraction isn’t supported yet — upload a .docx, or paste the transcript.')
  }

  throw new Error('Unsupported file type. Use .txt or .docx, or paste the transcript.')
}

export const OFFLINE_DOCUMENT_ACCEPT = '.txt,.md,.docx'
