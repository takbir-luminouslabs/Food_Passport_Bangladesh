export const FOODS_PER_PAGE = 6

/**
 * Pages of the open passport: the holder data page, then visa pages. A collection with more than six foods
 * continues on the next page, so every page holds the same amount and the book keeps one size.
 */
export function buildBookPages(collections, perPage = FOODS_PER_PAGE) {
  const pages = [{ type: 'data' }]
  let visaNo = 0
  for (const c of collections) {
    const parts = Math.ceil(c.foodIds.length / perPage)
    for (let part = 1; part <= parts; part++) {
      visaNo += 1
      pages.push({ type: 'visa', collectionId: c.id, part, parts, visaNo, foodIds: c.foodIds.slice((part - 1) * perPage, part * perPage) })
    }
  }
  return pages
}
