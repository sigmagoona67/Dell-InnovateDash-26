import { requireInsforge } from '../lib/insforgeClient'

export async function suggestStaffQuizOptions({ category, input, selected = [], previousSuggestions = [] }) {
  const { data, error } = await requireInsforge().functions.invoke('staff-ai-assist', {
    body: {
      action: 'suggestStaffQuizOptions',
      category,
      input,
      selected,
      previousSuggestions,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function getCompatibilityScore({ youthQuestionnaire, youthName }) {
  const { data, error } = await requireInsforge().functions.invoke('staff-ai-assist', {
    body: {
      action: 'compatibilityScore',
      youthQuestionnaire,
      youthName,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
