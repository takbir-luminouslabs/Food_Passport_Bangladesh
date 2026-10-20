/** Up to `n` untried foods, taken round-robin across categories so suggestions are varied. */
export function recommendFoods(foods, categories, triedIds, n = 4) {
  const queues = categories
    .map((c) => foods.filter((f) => f.category === c.id && !triedIds.has(f.id)))
    .filter((q) => q.length > 0)
  const picks = []
  for (let round = 0; picks.length < n && queues.some((q) => q.length > round); round++) {
    for (const q of queues) {
      if (picks.length < n && q[round]) picks.push(q[round])
    }
  }
  return picks
}

/** Incomplete challenges, closest to completion first (stable for ties). */
export function nextChallenges(challenges, n = 2) {
  const ratio = (c) => (c.target > 0 ? Math.min(c.current / c.target, 1) : 0)
  return challenges
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.completed)
    .sort((a, b) => ratio(b.c) - ratio(a.c) || a.i - b.i)
    .slice(0, n)
    .map(({ c }) => c)
}

/** Where a challenge's call-to-action should lead. */
export function challengeLink(rules) {
  if (rules.type === 'complete_collection') return { to: '/passport', labelKey: 'challenge.viewPassport' }
  const cat = rules.type === 'count_category' ? `cat=${rules.category}&` : ''
  return { to: `/discover?${cat}status=notTried`, labelKey: 'challenge.findFoods' }
}
