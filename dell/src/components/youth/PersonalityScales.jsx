import { useEffect } from 'react'
import { PERSONALITY_SCALES } from '../../lib/youthMockData'

function scaleLabel(scale, value) {
  if (value <= 3) return `Leans ${scale.left}`
  if (value >= 7) return `Leans ${scale.right}`
  return 'Balanced'
}

export default function PersonalityScales({ value = [], onChange }) {
  useEffect(() => {
    if (!value.length) {
      onChange(
        PERSONALITY_SCALES.map((scale) => ({
          id: scale.id,
          left: scale.left,
          right: scale.right,
          value: 5,
        })),
      )
    }
  }, [onChange, value.length])

  const scales = PERSONALITY_SCALES.map((scale) => {
    const existing = value.find((item) => item.id === scale.id)
    return {
      ...scale,
      value: existing?.value ?? 5,
    }
  })

  function updateScale(id, nextValue) {
    const updated = PERSONALITY_SCALES.map((scale) => {
      const current = scales.find((item) => item.id === scale.id)
      const numericValue = scale.id === id ? nextValue : (current?.value ?? 5)
      return {
        id: scale.id,
        left: scale.left,
        right: scale.right,
        value: numericValue,
      }
    })
    onChange(updated)
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <p className="text-sm text-slate-500">
        Move each slider to show where you fall on the spectrum. There is no right or wrong answer.
      </p>

      {scales.map((scale) => (
        <div key={scale.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm font-medium">
            <span className="text-slate-600">{scale.left}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
              {scaleLabel(scale, scale.value)}
            </span>
            <span className="text-slate-600">{scale.right}</span>
          </div>

          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={scale.value}
            onChange={(event) => updateScale(scale.id, Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-sky-200 via-teal-200 to-teal-400 accent-teal-500"
            aria-label={`${scale.left} to ${scale.right}`}
          />

          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      ))}
    </div>
  )
}
