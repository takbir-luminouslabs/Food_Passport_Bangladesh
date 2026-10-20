export const FOODS_PER_PAGE = 6

/**
 * Pages of the open passport: a welcome page, the holder's details, the "my food passport" profile, then for each
 * collection its visa pages (six stamps each; a bigger collection continues on the next page, so every page holds
 * the same amount and the book keeps one size), followed by one page for every food of it that has been tried.
 */
export function buildBookPages(collections, perPage = FOODS_PER_PAGE, triedIds = new Set()) {
  const pages = [{ type: 'welcome' }, { type: 'identity' }, { type: 'profile' }]
  let visaNo = 0
  for (const c of collections) {
    const parts = Math.ceil(c.foodIds.length / perPage)
    for (let part = 1; part <= parts; part++) {
      visaNo += 1
      pages.push({ type: 'visa', collectionId: c.id, part, parts, visaNo, foodIds: c.foodIds.slice((part - 1) * perPage, part * perPage) })
    }
    for (const foodId of c.foodIds) if (triedIds.has(foodId)) pages.push({ type: 'food', collectionId: c.id, foodId })
  }
  return pages
}
