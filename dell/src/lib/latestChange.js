export function isWeakLatestChange(text) {
  return !String(text || '').trim()
}

export function buildSpecificLatestChange() {
  return ''
}

export function resolveLatestChange({ saved = '' } = {}) {
  return String(saved || '').trim()
}
