import { invokeYouthAi } from './aiService'

export async function suggestOnboardingOptions({ category, input, selected = [], previousSuggestions = [] }) {
  return invokeYouthAi('suggestOnboardingOptions', {
    category,
    input,
    selected,
    previousSuggestions,
  })
}
