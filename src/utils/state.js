export const STATE_VERSION = 1
const LANGUAGES = ['bn', 'en']

const asIdList = (v) =>
  Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && x.length > 0))] : []

/** Fresh guest passport. XP, badges and challenges are derived from this, never stored. */
export function createInitialState(language = 'bn') {
  return {
    version: STATE_VERSION,
    language: LANGUAGES.includes(language) ? language : 'bn',
    triedFoodIds: [],
    quizProgress: { correctIds: [] },
    personalityResult: null,
  }
}

/** Validate/repair untrusted data (LocalStorage, imported backup). Returns null if unusable. */
export function sanitizeState(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (raw.version !== STATE_VERSION) return null
  return {
    version: STATE_VERSION,
    language: LANGUAGES.includes(raw.language) ? raw.language : 'bn',
    triedFoodIds: asIdList(raw.triedFoodIds),
    quizProgress: { correctIds: asIdList(raw.quizProgress?.correctIds) },
    personalityResult: typeof raw.personalityResult === 'string' ? raw.personalityResult : null,
  }
}

export const markTried = (state, foodId) =>
  state.triedFoodIds.includes(foodId) ? state : { ...state, triedFoodIds: [...state.triedFoodIds, foodId] }

export const unmarkTried = (state, foodId) => ({
  ...state,
  triedFoodIds: state.triedFoodIds.filter((id) => id !== foodId),
})

export const setLanguage = (state, language) => ({
  ...state,
  language: LANGUAGES.includes(language) ? language : state.language,
})

export const recordQuizCorrect = (state, questionId) =>
  state.quizProgress.correctIds.includes(questionId)
    ? state
    : { ...state, quizProgress: { correctIds: [...state.quizProgress.correctIds, questionId] } }

export const setPersonalityResult = (state, resultId) => ({
  ...state,
  personalityResult: typeof resultId === 'string' ? resultId : null,
})
