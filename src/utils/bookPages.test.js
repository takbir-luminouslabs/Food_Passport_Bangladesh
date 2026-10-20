import { FOODS_PER_PAGE, buildBookPages } from './bookPages'

const col = (id, n) => ({ id, foodIds: Array.from({ length: n }, (_, i) => `${id}-${i}`) })
const visa = (pages) => pages.filter((p) => p.type === 'visa')

test('six stamps per page', () => {
  expect(FOODS_PER_PAGE).toBe(6)
})

test('the book opens with a welcome page, the holder details page and the "my food passport" profile page', () => {
  const head = (pages) => pages.slice(0, 3).map((p) => p.type)
  expect(head(buildBookPages([col('a', 2)]))).toEqual(['welcome', 'identity', 'profile'])
  expect(buildBookPages([]).map((p) => p.type)).toEqual(['welcome', 'identity', 'profile'])
})

test('a small collection fits on one visa page and keeps its foods in order', () => {
  const page = visa(buildBookPages([col('a', 2)]))[0]
  expect(page).toMatchObject({ type: 'visa', collectionId: 'a', part: 1, parts: 1, visaNo: 1, foodIds: ['a-0', 'a-1'] })
})

test('a big collection is split into pages of six, none lost or repeated', () => {
  const pages = visa(buildBookPages([col('big', 13)]))
  expect(pages.map((p) => p.foodIds.length)).toEqual([6, 6, 1])
  expect(pages.map((p) => [p.part, p.parts])).toEqual([[1, 3], [2, 3], [3, 3]])
  expect(pages.flatMap((p) => p.foodIds)).toEqual(col('big', 13).foodIds)
})

test('exactly six foods stay on one page', () => {
  expect(visa(buildBookPages([col('a', 6)]))).toHaveLength(1)
})

test('visa pages are numbered in order across collections and empty collections add no page', () => {
  const pages = visa(buildBookPages([col('a', 2), col('empty', 0), col('b', 7)]))
  expect(pages.map((p) => [p.collectionId, p.visaNo])).toEqual([['a', 1], ['b', 2], ['b', 3]])
})

describe('food stamp pages', () => {
  test('no food has a page of its own until it has been tried', () => {
    expect(buildBookPages([col('a', 3)]).filter((p) => p.type === 'food')).toEqual([])
  })

  test('each tried food gets one page right after its collection, in collection order', () => {
    const pages = buildBookPages([col('a', 3), col('b', 2)], 6, new Set(['a-2', 'a-0', 'b-1']))
    expect(pages.slice(3).map((p) => [p.type, p.collectionId, p.foodId ?? null])).toEqual([
      ['visa', 'a', null], ['food', 'a', 'a-0'], ['food', 'a', 'a-2'],
      ['visa', 'b', null], ['food', 'b', 'b-1'],
    ])
  })

  test('food pages come after every visa page of a split collection', () => {
    const pages = buildBookPages([col('big', 8)], 6, new Set(['big-7']))
    expect(pages.slice(3).map((p) => p.type)).toEqual(['visa', 'visa', 'food'])
  })

  test('a food that is not in any collection never gets a page', () => {
    expect(buildBookPages([col('a', 1)], 6, new Set(['zzz'])).some((p) => p.type === 'food')).toBe(false)
  })
})
