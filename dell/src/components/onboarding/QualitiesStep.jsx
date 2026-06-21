import { useState } from 'react'
import { ChipButton, SelectionLimitHint } from './OnboardingShell'

export default function QualitiesStep({ options, selected = [], max = 5, onChange }) {
  const [limitMessage, setLimitMessage] = useState('')
  const atMax = selected.length >= max

  function toggle(option) {
    if (selected.includes(option)) {
      setLimitMessage('')
      onChange(selected.filter((item) => item !== option))
      return
    }

    if (selected.length >= max) {
      setLimitMessage(`You can only pick up to ${max} qualities.`)
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
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChipButton
            key={option}
            label={option}
            selected={selected.includes(option)}
            disabled={atMax}
            onToggle={() => toggle(option)}
          />
        ))}
      </div>
    </div>
  )
}

export function hasMinSelection(selected, min = 1) {
  return (selected || []).length >= min
}
