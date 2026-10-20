import { fixture } from '../test/fixtures'
import { buildCollections, collectionProgress } from './collections'

const cols = buildCollections(fixture.foods, fixture.categories)

test('one collection per non-empty category, in category order', () => {
  expect(cols.map((c) => c.id)).toEqual(['street_food', 'sweets_desserts', 'drinks'])
})

test('collection totals match the underlying food records', () => {
  expect(cols.map((c) => c.foodIds.length)).toEqual([2, 3, 1])
  expect(cols.flatMap((c) => c.foodIds).sort()).toEqual(fixture.foods.map((f) => f.id).sort())
})

test('collection progress counts only tried foods inside it', () => {
  const p = collectionProgress(cols[1], new Set(['m1', 's1', 'ghost']))
  expect(p).toEqual({ collected: 1, total: 3, percent: 33, complete: false })
})

test('complete collection', () => {
  expect(collectionProgress(cols[2], new Set(['d1']))).toEqual({ collected: 1, total: 1, percent: 100, complete: true })
})
