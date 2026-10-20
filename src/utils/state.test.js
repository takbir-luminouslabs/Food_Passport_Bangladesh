import {
  createInitialState, markTried, recordQuizCorrect, sanitizeState, setLanguage, setPersonalityResult, unmarkTried,
} from './state'

test('initial state matches the PRD guest data shape', () => {
  expect(createInitialState()).toEqual({
    version: 1, language: 'bn', triedFoodIds: [], quizProgress: { correctIds: [] }, personalityResult: null,
  })
})

test('markTried is idempotent and does not mutate', () => {
  const s0 = createInitialState()
  const s1 = markTried(s0, 'a')
  const s2 = markTried(s1, 'a')
  expect(s0.triedFoodIds).toEqual([])
  expect(s2.triedFoodIds).toEqual(['a'])
})

test('unmarkTried removes only that food and ignores unknown ids', () => {
  const s = markTried(markTried(createInitialState(), 'a'), 'b')
  expect(unmarkTried(s, 'a').triedFoodIds).toEqual(['b'])
  expect(unmarkTried(s, 'zzz').triedFoodIds).toEqual(['a', 'b'])
})

test('setLanguage accepts bn/en only', () => {
  expect(setLanguage(createInitialState(), 'en').language).toBe('en')
  expect(setLanguage(createInitialState(), 'fr').language).toBe('bn')
})

test('recordQuizCorrect is idempotent per question', () => {
  const s = recordQuizCorrect(recordQuizCorrect(createInitialState(), 'q1'), 'q1')
  expect(s.quizProgress.correctIds).toEqual(['q1'])
})

test('setPersonalityResult stores a result id or null', () => {
  expect(setPersonalityResult(createInitialState(), 'pitha-lover').personalityResult).toBe('pitha-lover')
  expect(setPersonalityResult(createInitialState(), null).personalityResult).toBeNull()
})

describe('sanitizeState (malformed or outdated stored data)', () => {
  test.each([[null], [undefined], ['str'], [42], [[]], [{}]])('rejects %j', (raw) => {
    expect(sanitizeState(raw)).toBeNull()
  })

  test('rejects unknown/future versions', () => {
    expect(sanitizeState({ version: 99, triedFoodIds: ['a'] })).toBeNull()
  })

  test('keeps valid data', () => {
    const raw = { version: 1, language: 'en', triedFoodIds: ['a', 'b'], quizProgress: { correctIds: ['q1'] }, personalityResult: 'x' }
    expect(sanitizeState(raw)).toEqual(raw)
  })

  test('repairs bad fields instead of crashing', () => {
    const s = sanitizeState({
      version: 1, language: 'zz', triedFoodIds: ['a', 'a', 5, null, '', 'b'],
      quizProgress: { correctIds: 'nope' }, personalityResult: { evil: true },
    })
    expect(s).toEqual({
      version: 1, language: 'bn', triedFoodIds: ['a', 'b'], quizProgress: { correctIds: [] }, personalityResult: null,
    })
  })

  test('drops unexpected extra keys (e.g. an injected xp counter)', () => {
    const s = sanitizeState({ version: 1, triedFoodIds: [], totalXp: 999999 })
    expect(s).not.toHaveProperty('totalXp')
  })
})
