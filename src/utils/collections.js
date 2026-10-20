/** Each non-empty food category is a passport collection. */
export function buildCollections(foods, categories) {
  return categories
    .map((c) => ({
      id: c.id,
      name_bn: c.name_bn,
      name_en: c.name_en,
      foodIds: foods.filter((f) => f.category === c.id).map((f) => f.id),
    }))
    .filter((c) => c.foodIds.length > 0)
}

export function collectionProgress(collection, triedIds) {
  const total = collection.foodIds.length
  const collected = collection.foodIds.filter((id) => triedIds.has(id)).length
  return {
    collected,
    total,
    percent: total === 0 ? 0 : Math.round((collected / total) * 100),
    complete: total > 0 && collected === total,
  }
}
