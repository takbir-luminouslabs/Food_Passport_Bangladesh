import { FOODS_PER_PAGE, buildBookPages } from './bookPages'

const col = (id, n) => ({ id, foodIds: Array.from({ length: n }, (_, i) => `${id}-${i}`) })

test('six stamps per page', () => {
  expect(FOODS_PER_PAGE).toBe(6)
})

test('the first page is always the holder data page', () => {
  expect(buildBookPages([col('a', 2)])[0]).toEqual({ type: 'data' })
  expect(buildBookPages([])).toEqual([{ type: 'data' }])
})

test('a small collection fits on one visa page and keeps its foods in order', () => {
  const [, page] = buildBookPages([col('a', 2)])
  expect(page).toMatchObject({ type: 'visa', collectionId: 'a', part: 1, parts: 1, visaNo: 1, foodIds: ['a-0', 'a-1'] })
})

test('a big collection is split into pages of six, none lost or repeated', () => {
  const pages = buildBookPages([col('big', 13)]).filter((p) => p.type === 'visa')
  expect(pages.map((p) => p.foodIds.length)).toEqual([6, 6, 1])
  expect(pages.map((p) => [p.part, p.parts])).toEqual([[1, 3], [2, 3], [3, 3]])
  expect(pages.flatMap((p) => p.foodIds)).toEqual(col('big', 13).foodIds)
})

test('exactly six foods stay on one page', () => {
  expect(buildBookPages([col('a', 6)]).filter((p) => p.type === 'visa')).toHaveLength(1)
})

test('visa pages are numbered in order across collections and empty collections add no page', () => {
  const pages = buildBookPages([col('a', 2), col('empty', 0), col('b', 7)]).filter((p) => p.type === 'visa')
  expect(pages.map((p) => [p.collectionId, p.visaNo])).toEqual([['a', 1], ['b', 2], ['b', 3]])
})
