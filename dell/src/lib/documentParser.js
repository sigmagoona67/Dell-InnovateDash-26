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
      throw new Error(
        'This Word document looks empty. Use fixtures/demo-offline-session-transcript.txt or paste the transcript instead.',
      )
    }
    return text
  }

  if (name.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported. Save as .docx or paste the transcript.')
  }

  if (name.endsWith('.pdf')) {
    throw new Error('PDF text extraction is not supported yet. Paste the transcript or upload a .docx file.')
  }

  throw new Error('Unsupported file type. Use .txt or .docx, or paste the transcript.')
}

export const OFFLINE_DOCUMENT_ACCEPT = '.txt,.md,.docx,.doc,.pdf'
