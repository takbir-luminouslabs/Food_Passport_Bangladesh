import { fixture } from '../test/fixtures'
import { buildCollections } from './collections'
import { evaluateRule } from './rules'

const ctx = (tried = [], extra = {}) => ({
  foods: fixture.foods,
  collections: buildCollections(fixture.foods, fixture.categories),
  triedIds: new Set(tried),
  baseXp: 0, challengesCompleted: 0, quizCorrect: 0,
  ...extra,
})

test('count_category', () => {
  const rule = { type: 'count_category', category: 'street_food', target: 2 }
  expect(evaluateRule(rule, ctx(['s1']))).toEqual({ current: 1, target: 2, met: false })
  expect(evaluateRule(rule, ctx(['s1', 's2', 'm1']))).toEqual({ current: 2, target: 2, met: true })
})

test('count_total and stamps_total are the same measure', () => {
  for (const type of ['count_total', 'stamps_total']) {
    expect(evaluateRule({ type, target: 3 }, ctx(['s1', 'm1', 'd1'])).met).toBe(true)
    expect(evaluateRule({ type, target: 3 }, ctx(['s1', 'm1'])).met).toBe(false)
  }
})

test('distinct_categories', () => {
  expect(evaluateRule({ type: 'distinct_categories', target: 2 }, ctx(['s1', 's2']))).toMatchObject({ current: 1, met: false })
  expect(evaluateRule({ type: 'distinct_categories', target: 2 }, ctx(['s1', 'm1']))).toMatchObject({ current: 2, met: true })
})

test('count_regional counts only district-associated foods', () => {
  expect(evaluateRule({ type: 'count_regional', target: 2 }, ctx(['s1', 'm1', 'm3']))).toMatchObject({ current: 1, met: false })
  expect(evaluateRule({ type: 'count_regional', target: 2 }, ctx(['m1', 'd1']))).toMatchObject({ current: 2, met: true })
})

test('complete_collection is met once any collection is fully collected', () => {
  const rule = { type: 'complete_collection', target: 1 }
  expect(evaluateRule(rule, ctx(['s1', 'm1'])).met).toBe(false)
  expect(evaluateRule(rule, ctx(['d1']))).toEqual({ current: 1, target: 1, met: true })
})

test('xp_total, challenges_completed and quiz_correct read from context', () => {
  expect(evaluateRule({ type: 'xp_total', target: 100 }, ctx([], { baseXp: 90 })).met).toBe(false)
  expect(evaluateRule({ type: 'xp_total', target: 100 }, ctx([], { baseXp: 100 })).met).toBe(true)
  expect(evaluateRule({ type: 'challenges_completed', target: 5 }, ctx([], { challengesCompleted: 5 })).met).toBe(true)
  expect(evaluateRule({ type: 'quiz_correct', target: 10 }, ctx([], { quizCorrect: 9 })).met).toBe(false)
})

test('unknown rule types throw so typos in JSON are caught', () => {
  expect(() => evaluateRule({ type: 'nope', target: 1 }, ctx())).toThrow(/nope/)
})
