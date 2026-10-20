import { LEVELS, XP_RULES, levelForXp } from './xp'

test('XP rules match the PRD defaults', () => {
  expect(XP_RULES).toEqual({ TRY_FOOD: 10, CHALLENGE: 25, QUIZ_CORRECT: 5 })
})

test('there are 5 levels with the PRD thresholds', () => {
  expect(LEVELS.map((l) => l.threshold)).toEqual([0, 100, 300, 700, 1500])
  expect(LEVELS[0].name_en).toBe('Curious Eater')
  expect(LEVELS[4].name_en).toBe('Bangladesh Food Legend')
})

test.each([
  [0, 1], [99, 1], [100, 2], [299, 2], [300, 3], [699, 3], [700, 4], [1499, 4], [1500, 5], [99999, 5],
])('%i XP is level %i', (xp, level) => {
  expect(levelForXp(xp).level).toBe(level)
})

test('progress toward the next level', () => {
  const l = levelForXp(150)
  expect(l.nextLevelXp).toBe(300)
  expect(l.xpToNext).toBe(150)
  expect(l.progress).toBeCloseTo(0.25)
})

test('max level has no next level and full progress', () => {
  const l = levelForXp(2000)
  expect(l.nextLevelXp).toBeNull()
  expect(l.xpToNext).toBe(0)
  expect(l.progress).toBe(1)
})

test.each([[-5], [NaN], [undefined], ['abc']])('invalid XP %s falls back to level 1', (v) => {
  expect(levelForXp(v).level).toBe(1)
})
