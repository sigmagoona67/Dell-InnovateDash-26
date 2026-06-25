import { useCallback, useState } from 'react'
import { Check, Plus, Sparkles } from 'lucide-react'
import { suggestOnboardingOptions } from '../../services/onboardingAiService'
import Button from '../ui/Button'

function OptionChip({ label, selected, onToggle, accent = 'teal' }) {
  const selectedClass =
    accent === 'sky'
      ? 'border-sky-500 bg-sky-50 text-sky-600'
      : 'border-teal-500 bg-teal-50 text-teal-600'
  const idleClass =
    accent === 'sky'
      ? 'border-slate-200 bg-white text-slate-800 hover:border-sky-100 hover:bg-sky-50'
      : 'border-slate-200 bg-white text-slate-800 hover:border-teal-100 hover:bg-teal-50'
  const ringClass = accent === 'sky' ? 'focus-visible:ring-sky-500' : 'focus-visible:ring-teal-500'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        inline-flex items-center gap-2 rounded-control border px-4 py-2.5 text-left text-sm font-medium transition
        focus-visible:outline-none focus-visible:ring-2 ${ringClass} focus-visible:ring-offset-2
        ${selected ? selectedClass : idleClass}
      `}
      aria-pressed={selected}
    >
      {selected ? (
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Plus className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      )}
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

  const ringClass = accent === 'sky' ? 'focus-visible:ring-sky-500' : 'focus-visible:ring-teal-500'

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
            className={`flex-1 rounded-control border border-slate-200 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass}`}
          />
          <Button
            type="button"
            accent={accent}
            onClick={handleSuggest}
            loading={loading}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Thinking…' : 'Show options'}
          </Button>
        </div>
        {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-control bg-danger-100 px-4 py-3 text-sm text-danger-700">
          {error}
        </p>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-600">Suggested options</p>
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
          <p className="mt-2 text-sm text-slate-500">
            Tap any that fit you. Type more above and tap Show options for fresh suggestions.
          </p>
        </div>
      )}

      {selected.length > 0 && (
        <div>
          <p className={`mb-3 text-sm font-semibold ${accent === 'sky' ? 'text-sky-600' : 'text-teal-600'}`}>
            Your selections
          </p>
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
