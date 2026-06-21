import { useState } from 'react'
import { INTEREST_CATEGORIES } from '../../lib/onboardingData'
import { ChipButton, SelectionLimitHint } from './OnboardingShell'

export default function InterestsStep({ selected = [], max = 6, onChange }) {
  const [expandedCategory, setExpandedCategory] = useState('')
  const atMax = selected.length >= max

  function toggle(label) {
    if (selected.includes(label)) {
      onChange(selected.filter((item) => item !== label))
      return
    }
    if (selected.length >= max) return
    onChange([...selected, label])
  }

  function toggleCategory(category) {
    setExpandedCategory((prev) => (prev === category ? '' : category))
  }

  function categoryIsHighlighted(category) {
    const hasSelectedInCategory = INTEREST_CATEGORIES[category].some((label) =>
      selected.includes(label)
    )
    return expandedCategory === category || hasSelectedInCategory
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <SelectionLimitHint selected={selected.length} max={max} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {Object.keys(INTEREST_CATEGORIES).map((category) => (
          <ChipButton
            key={category}
            label={category}
            selected={categoryIsHighlighted(category)}
            onToggle={() => toggleCategory(category)}
          />
        ))}
      </div>

      {expandedCategory && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">{expandedCategory}</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_CATEGORIES[expandedCategory].map((label) => (
              <ChipButton
                key={label}
                label={label}
                selected={selected.includes(label)}
                disabled={atMax}
                onToggle={() => toggle(label)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function hasMinSelection(selected, min = 1) {
  return (selected || []).length >= min
}
