import { useEffect, useMemo, useState } from 'react'
import {
  COMMON_LANGUAGES,
  COUNTRIES,
  GENDER_OPTIONS,
  WORKER_AGE_PREFS,
  WORKER_GENDER_PREFS,
} from '../../lib/onboardingData'
import { ChipButton } from './OnboardingShell'
import DateOfBirthField from './DateOfBirthField'
import { isDobAtLeastMinAge } from '../../lib/onboardingData'

function FieldLabel({ children }) {
  return <label className="mb-2 block text-sm font-semibold text-slate-700">{children}</label>
}

function SearchableSelect({ value, options, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, query])

  function pick(option) {
    onChange(option)
    setQuery(option)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value.trim()) onChange('')
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-teal-50"
                onMouseDown={() => pick(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function BasicInfoStep({ form, onChange, showWorkerPrefs = false, minAge = null }) {
  function setField(key, value) {
    onChange({ ...form, [key]: value })
  }

  function toggleLanguage(lang) {
    const current = form.languages || []
    const next = current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang]
    setField('languages', next)
  }

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Date of Birth</FieldLabel>
        <DateOfBirthField
          value={form.dateOfBirth || ''}
          onChange={(dateOfBirth) => setField('dateOfBirth', dateOfBirth)}
          minAge={minAge}
        />
        {minAge != null && (
          <p className="mt-2 text-sm text-slate-500">You must be at least {minAge} years old.</p>
        )}
      </div>

      <div>
        <FieldLabel>Gender</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((option) => (
            <ChipButton
              key={option}
              label={option}
              selected={form.gender === option}
              onToggle={() => setField('gender', option)}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Country</FieldLabel>
        <SearchableSelect
          value={form.country}
          options={COUNTRIES}
          placeholder="Search or select country"
          onChange={(val) => setField('country', val)}
        />
      </div>

      <div>
        <FieldLabel>Languages you are comfortable speaking</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {COMMON_LANGUAGES.map((lang) => (
            <ChipButton
              key={lang}
              label={lang}
              selected={(form.languages || []).includes(lang)}
              onToggle={() => toggleLanguage(lang)}
            />
          ))}
        </div>
      </div>

      {showWorkerPrefs && (
        <div className="space-y-5 border-t border-slate-100 pt-6">
          <p className="text-base font-semibold text-slate-800">Youth Worker Preference</p>

          <div>
            <FieldLabel>Preferred Gender of Youth Worker</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {WORKER_GENDER_PREFS.map((option) => (
                <ChipButton
                  key={option}
                  label={option}
                  selected={form.preferredWorkerGender === option}
                  onToggle={() => setField('preferredWorkerGender', option)}
                />
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Preferred Age Range of Youth Worker</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {WORKER_AGE_PREFS.map((option) => (
                <ChipButton
                  key={option}
                  label={option}
                  selected={form.preferredWorkerAgeRange === option}
                  onToggle={() => setField('preferredWorkerAgeRange', option)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function isBasicInfoComplete(form, { requireWorkerPrefs = false, minAge = null } = {}) {
  if (!form.dateOfBirth || !form.gender || !form.country) return false
  if (!isDobAtLeastMinAge(form.dateOfBirth, minAge)) return false
  if (!(form.languages || []).length) return false
  if (requireWorkerPrefs) {
    if (!form.preferredWorkerGender || !form.preferredWorkerAgeRange) return false
  }
  return true
}
