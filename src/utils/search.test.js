import { filterFoods } from './search'

const foods = [
  { id: 'a', name_bn: 'চটপটি', name_en: 'Chotpoti', category: 'street_food', region: { district_en: 'Dhaka', district_bn: 'ঢাকা' } },
  { id: 'b', name_bn: 'নাটোরের কাঁচাগোল্লা', name_en: 'Natore Kacha Gola', category: 'sweets_desserts', region: { district_en: 'Natore', district_bn: 'নাটোর' } },
  { id: 'c', name_bn: 'ফুচকা', name_en: 'Fuchka', category: 'street_food', region: null },
]
const ids = (r) => r.map((f) => f.id)
const run = (o) => ids(filterFoods({ foods, query: '', category: 'all', status: 'all', triedIds: new Set(), ...o }))

test('no filters returns everything in catalogue order', () => {
  expect(run({})).toEqual(['a', 'b', 'c'])
})

test('searches English names, case-insensitively', () => {
  expect(run({ query: 'CHOT' })).toEqual(['a'])
})

test('searches Bengali names', () => {
  expect(run({ query: 'ফুচকা' })).toEqual(['c'])
})

test('searches district names in both languages', () => {
  expect(run({ query: 'natore' })).toEqual(['b'])
  expect(run({ query: 'ঢাকা' })).toEqual(['a'])
})

test('every word must match (extra spaces ignored)', () => {
  expect(run({ query: '  kacha   gola ' })).toEqual(['b'])
  expect(run({ query: 'kacha chotpoti' })).toEqual([])
})

test('filters by category', () => {
  expect(run({ category: 'street_food' })).toEqual(['a', 'c'])
})

test('filters by tried status', () => {
  expect(run({ status: 'tried', triedIds: new Set(['a']) })).toEqual(['a'])
  expect(run({ status: 'notTried', triedIds: new Set(['a']) })).toEqual(['b', 'c'])
})

test('filters combine', () => {
  expect(run({ query: 'f', category: 'street_food', status: 'notTried', triedIds: new Set(['a']) })).toEqual(['c'])
})
