const norm = (s) => String(s ?? '').normalize('NFC').toLowerCase()

const haystack = (f) =>
  norm([f.name_bn, f.name_en, f.region?.district_bn, f.region?.district_en].filter(Boolean).join(' '))

/** Bilingual search (food + district names), category and tried-status filters. Every query word must match. */
export function filterFoods({ foods, query, category, status, triedIds }) {
  const words = norm(query).split(/\s+/).filter(Boolean)
  return foods.filter((f) => {
    if (category !== 'all' && f.category !== category) return false
    if (status === 'tried' && !triedIds.has(f.id)) return false
    if (status === 'notTried' && triedIds.has(f.id)) return false
    if (words.length === 0) return true
    const h = haystack(f)
    return words.every((w) => h.includes(w))
  })
}
