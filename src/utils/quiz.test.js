import { expect, test } from 'vitest'
import { buildRound, shuffle } from './quiz'

const qs = [
  { id: 'a', options: [{ en: 'A0' }, { en: 'A1' }, { en: 'A2' }, { en: 'A3' }], correct: 0 },
  { id: 'b', options: [{ en: 'B0' }, { en: 'B1' }, { en: 'B2' }, { en: 'B3' }], correct: 2 },
]

test('shuffle keeps every item and does not change the input', () => {
  const input = [1, 2, 3, 4, 5]
  const out = shuffle(input)
  expect([...out].sort()).toEqual(input)
  expect(input).toEqual([1, 2, 3, 4, 5])
})

test('a round keeps every question, and the correct index still points at the right option', () => {
  for (let n = 0; n < 20; n++) {
    const round = buildRound(qs)
    expect(round.map((q) => q.id).sort()).toEqual(['a', 'b'])
    for (const q of round) {
      const expected = q.id === 'a' ? 'A0' : 'B2'
      expect(q.options[q.correct].en).toBe(expected)
      expect(q.options).toHaveLength(4)
    }
  }
})

test('each shuffled option remembers its original position, so the server can check it', () => {
  const [q] = buildRound([qs[1]])
  for (const o of q.options) expect(o.en).toBe(`B${o.index}`)
  expect(q.options[q.correct].index).toBe(2)
})
