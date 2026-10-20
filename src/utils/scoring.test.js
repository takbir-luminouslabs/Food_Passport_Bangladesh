import { fixture, realContent } from '../test/fixtures'
import { computeProgress, diffProgress } from './scoring'
import { createInitialState, markTried, recordQuizCorrect, unmarkTried } from './state'

const mark = (ids, base = createInitialState()) => ids.reduce(markTried, base)
const run = (state) => computeProgress(state, fixture)

test('empty passport', () => {
  const p = run(createInitialState())
  expect(p).toMatchObject({ triedCount: 0, baseXp: 0, challengeXp: 0, totalXp: 0, completionPercent: 0 })
  expect(p.level.level).toBe(1)
  expect(p.completedChallengeIds).toEqual([])
  expect(p.earnedBadgeIds).toEqual([])
})

test('inactive challenges are excluded', () => {
  expect(run(createInitialState()).challenges.map((c) => c.id)).toEqual(['c-street', 'c-xp', 'c-col'])
})

test('trying one food earns 10 XP and the first badge', () => {
  const p = run(mark(['s1']))
  expect(p.totalXp).toBe(10)
  expect(p.earnedBadgeIds).toEqual(['b-first'])
})

test('challenge rewards are added once, derived from progress', () => {
  const p = run(mark(['s1', 's2']))
  // 20 base + c-street 25 + c-col 25 (street collection complete). c-xp needs 30 base.
  expect(p.baseXp).toBe(20)
  expect(p.completedChallengeIds).toEqual(['c-street', 'c-col'])
  expect(p.challengeXp).toBe(50)
  expect(p.totalXp).toBe(70)
  expect(p.earnedBadgeIds).toEqual(['b-first', 'b-ch'])
})

test('xp_total challenge uses base XP only (no circular rewards)', () => {
  const p = run(mark(['s1', 's2', 'm1']))
  expect(p.baseXp).toBe(30)
  expect(p.completedChallengeIds).toContain('c-xp')
})

test('mark/unmark farming cannot inflate XP', () => {
  let s = createInitialState()
  for (let i = 0; i < 5; i++) s = unmarkTried(markTried(markTried(s, 's1'), 's2'), 's2')
  s = markTried(s, 's2')
  expect(run(s).totalXp).toBe(run(mark(['s1', 's2'])).totalXp)
})

test('unmarking recalculates: rewards and badges are withdrawn', () => {
  const p = run(unmarkTried(mark(['s1', 's2']), 's2'))
  expect(p.totalXp).toBe(10)
  expect(p.completedChallengeIds).toEqual([])
  expect(p.earnedBadgeIds).toEqual(['b-first'])
})

test('foods missing from the catalogue are ignored, not fatal', () => {
  const p = run(mark(['ghost', 's1']))
  expect(p.triedCount).toBe(1)
  expect(p.triedIds).toEqual(['s1'])
})

test('quiz answers give 5 XP each, once per question', () => {
  const s = recordQuizCorrect(recordQuizCorrect(recordQuizCorrect(createInitialState(), 'q1'), 'q2'), 'q1')
  const p = run(s)
  expect(p.baseXp).toBe(10)
  expect(p.earnedBadgeIds).toEqual(['b-quiz'])
})

test('collections report progress per collection', () => {
  const p = run(mark(['s1', 'm1']))
  expect(p.collections.map((c) => [c.id, c.collected, c.total])).toEqual([
    ['street_food', 1, 2], ['sweets_desserts', 1, 3], ['drinks', 0, 1],
  ])
  expect(p.completionPercent).toBe(33)
})

test('level is derived from total XP including challenge rewards', () => {
  const p = run(mark(['s1', 's2', 'm1', 'm2', 'm3', 'd1']))
  // 60 base + c-street + c-xp + c-col = 135
  expect(p.totalXp).toBe(135)
  expect(p.level.level).toBe(2)
})

describe('diffProgress (celebration feedback)', () => {
  test('reports XP, level-up, new stamps, challenges and badges', () => {
    const before = run(createInitialState())
    const after = run(mark(['s1', 's2', 'm1', 'm2', 'm3', 'd1']))
    expect(diffProgress(before, after)).toMatchObject({
      xpDelta: 135, leveledUp: true, newStampIds: ['s1', 's2', 'm1', 'm2', 'm3', 'd1'],
      newChallengeIds: ['c-street', 'c-xp', 'c-col'], newBadgeIds: ['b-first', 'b-ch'],
    })
    expect(diffProgress(before, after).newLevel.level).toBe(2)
  })

  test('no change means an empty diff', () => {
    const p = run(mark(['s1']))
    expect(diffProgress(p, p)).toMatchObject({ xpDelta: 0, leveledUp: false, newStampIds: [], newBadgeIds: [], newChallengeIds: [] })
  })
})

describe('against the real catalogue', () => {
  const real = realContent()
  const ids = (cat, n) => real.foods.filter((f) => f.category === cat).slice(0, n).map((f) => f.id)

  test('2 pitha: 20 XP + pitha challenge, pitha badge', () => {
    const p = computeProgress(mark(ids('pitha_snacks', 2)), real)
    expect(p.baseXp).toBe(20)
    expect(p.completedChallengeIds).toContain('pitha-2')
    expect(p.earnedBadgeIds).toEqual(expect.arrayContaining(['first-bite', 'pitha-lover']))
    expect(p.totalXp).toBe(p.baseXp + 25 * p.completedChallengeIds.length)
  })

  test('completing the smallest collection completes the first-collection challenge', () => {
    const smallest = real.categories
      .map((c) => ({ id: c.id, n: real.foods.filter((f) => f.category === c.id).length }))
      .filter((c) => c.n > 0)
      .sort((a, b) => a.n - b.n)[0]
    const p = computeProgress(mark(ids(smallest.id, smallest.n)), real)
    expect(p.completedChallengeIds).toContain('first-collection')
  })

  test('trying every food completes every challenge and food badge', () => {
    const p = computeProgress(mark(real.foods.map((f) => f.id)), real)
    expect(p.completedChallengeIds.length).toBe(real.challenges.length)
    expect(p.earnedBadgeIds).toEqual(
      expect.arrayContaining(['first-bite', 'sweet-tooth', 'pitha-lover', 'food-adventurer', 'food-collector', 'flavour-master']),
    )
    expect(p.earnedBadgeIds).not.toContain('quiz-champion')
    expect(p.completionPercent).toBe(100)
  })
})
