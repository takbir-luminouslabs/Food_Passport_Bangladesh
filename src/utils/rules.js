import { collectionProgress } from './collections'

/**
 * Evaluate a challenge/badge rule against a context:
 * { foods, collections, triedIds:Set, baseXp, challengesCompleted, quizCorrect }
 * Returns { current, target, met }.
 */
export function evaluateRule(rule, ctx) {
  const tried = ctx.foods.filter((f) => ctx.triedIds.has(f.id))
  const target = rule.target ?? 1
  let current
  switch (rule.type) {
    case 'count_category':
      current = tried.filter((f) => f.category === rule.category).length
      break
    case 'count_total':
    case 'stamps_total':
      current = tried.length
      break
    case 'distinct_categories':
      current = new Set(tried.map((f) => f.category)).size
      break
    case 'count_regional':
      current = tried.filter((f) => f.scope === 'regional').length
      break
    case 'complete_collection':
      current = ctx.collections.filter((c) => collectionProgress(c, ctx.triedIds).complete).length
      break
    case 'xp_total':
      current = ctx.baseXp
      break
    case 'challenges_completed':
      current = ctx.challengesCompleted
      break
    case 'quiz_correct':
      current = ctx.quizCorrect
      break
    default:
      throw new Error(`Unknown rule type: ${rule.type}`)
  }
  return { current, target, met: current >= target }
}
