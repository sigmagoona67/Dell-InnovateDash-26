import { useCallback, useState } from 'react'
import { suggestOnboardingOptions } from '../../services/onboardingAiService'

function OptionChip({ label, selected, onToggle, accent = 'teal' }) {
  const selectedClass =
    accent === 'sky'
      ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-sm'
      : 'border-teal-400 bg-teal-50 text-teal-700 shadow-sm'
  const idleClass =
    accent === 'sky'
      ? 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/50'
      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50'
  const ringClass = accent === 'sky' ? 'focus-visible:ring-sky-400' : 'focus-visible:ring-teal-400'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        rounded-2xl border px-4 py-2.5 text-left text-sm font-medium transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 ${ringClass} focus-visible:ring-offset-2
        ${selected ? selectedClass : idleClass}
      `}
      aria-pressed={selected}
    >
      <span className="mr-2 inline-block w-4">{selected ? '☑' : '☐'}</span>
      {label}
    </button>
  )
}

export default function AiTagPicker({
  category,
  placeholder,
  hint,
  value = [],
  onChange,
  fetchSuggestions,
  accent = 'teal',
}) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = Array.isArray(value) ? value : []

  const toggleSelection = useCallback(
    (option) => {
      const next = selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option]
      onChange(next)
    },
    [onChange, selected],
  )

  async function handleSuggest() {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError('')
    try {
      const suggest = fetchSuggestions || suggestOnboardingOptions
      const { suggestions: nextSuggestions } = await suggest({
        category,
        input: trimmed,
        selected,
        previousSuggestions: suggestions,
      })
      setSuggestions(nextSuggestions || [])
    } catch (err) {
      setError(err.message || 'Unable to load suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSuggest()
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <label htmlFor={`ai-tag-input-${category}`} className="sr-only">
          Describe your {category}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={`ai-tag-input-${category}`}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 ${accent === 'sky' ? 'focus-visible:ring-sky-400' : 'focus-visible:ring-teal-400'}`}
          />
          <button
            type="button"
            onClick={handleSuggest}
            disabled={loading || !input.trim()}
            className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${accent === 'sky' ? 'bg-sky-500 hover:bg-sky-600 focus-visible:ring-sky-400' : 'bg-teal-500 hover:bg-teal-600 focus-visible:ring-teal-400'}`}
          >
            {loading ? 'Thinking…' : 'Show options'}
          </button>
        </div>
        {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">Suggested options</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((option) => (
              <OptionChip
                key={option}
                label={option}
                selected={selected.includes(option)}
                onToggle={() => toggleSelection(option)}
                accent={accent}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Tap any that fit you. Type more above and click Show options for fresh suggestions.
          </p>
        </div>
      )}

      {selected.length > 0 && (
        <div>
          <p className={`mb-3 text-sm font-semibold ${accent === 'sky' ? 'text-sky-700' : 'text-teal-700'}`}>Your selections</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((option) => (
              <OptionChip
                key={`selected-${option}`}
                label={option}
                selected
                onToggle={() => toggleSelection(option)}
                accent={accent}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
