import { nextChallenges, recommendFoods } from './recommend'

const foods = [
  { id: 's1', category: 'street' }, { id: 's2', category: 'street' },
  { id: 'm1', category: 'sweet' }, { id: 'm2', category: 'sweet' },
  { id: 'd1', category: 'drink' },
]
const categories = [{ id: 'street' }, { id: 'sweet' }, { id: 'drink' }]
const ids = (l) => l.map((f) => f.id)

test('recommends untried foods, one category at a time for variety', () => {
  expect(ids(recommendFoods(foods, categories, new Set(), 4))).toEqual(['s1', 'm1', 'd1', 's2'])
})

test('skips tried foods', () => {
  expect(ids(recommendFoods(foods, categories, new Set(['s1', 'm1']), 3))).toEqual(['s2', 'm2', 'd1'])
})

test('returns fewer when little is left, and nothing when all are tried', () => {
  expect(ids(recommendFoods(foods, categories, new Set(['s1', 's2', 'm1', 'm2']), 4))).toEqual(['d1'])
  expect(recommendFoods(foods, categories, new Set(foods.map((f) => f.id)), 4)).toEqual([])
})

describe('nextChallenges', () => {
  const ch = (id, current, target, completed = false) => ({ id, current, target, completed })
  test('closest-to-done incomplete challenges first, stable for ties', () => {
    const list = [ch('a', 1, 10), ch('b', 4, 5), ch('c', 5, 5, true), ch('d', 1, 10), ch('e', 0, 3)]
    expect(nextChallenges(list, 3).map((c) => c.id)).toEqual(['b', 'a', 'd'])
  })
  test('empty when everything is complete', () => {
    expect(nextChallenges([ch('a', 1, 1, true)], 2)).toEqual([])
  })
})
