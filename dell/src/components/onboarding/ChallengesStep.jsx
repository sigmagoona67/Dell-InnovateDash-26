import { useState } from 'react'
import { CHALLENGE_CATEGORIES } from '../../lib/onboardingData'
import { ChipButton, SelectionLimitHint } from './OnboardingShell'

export default function ChallengesStep({ selected = [], max = 4, onChange, note }) {
  const [limitMessage, setLimitMessage] = useState('')
  const atMax = selected.length >= max

  function toggle(option) {
    if (selected.includes(option)) {
      setLimitMessage('')
      onChange(selected.filter((item) => item !== option))
      return
    }

    if (selected.length >= max) {
      setLimitMessage(`You can only pick up to ${max} areas.`)
      return
    }

    setLimitMessage('')
    onChange([...selected, option])
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <SelectionLimitHint selected={selected.length} max={max} limitMessage={limitMessage} />
      </div>

      <div className="space-y-6">
        {CHALLENGE_CATEGORIES.map((category) => (
          <div key={category.label}>
            <p className="mb-3 text-base font-semibold text-gray-700">{category.label}</p>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item) => (
                <ChipButton
                  key={item}
                  label={item}
                  selected={selected.includes(item)}
                  disabled={atMax}
                  onToggle={() => toggle(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {note && <p className="mt-6 text-sm text-slate-500">{note}</p>}
    </div>
  )
}

export function hasMinSelection(selected, min = 1) {
  return (selected || []).length >= min
}
