import { buildCollections, collectionProgress } from './collections'
import { evaluateRule } from './rules'
import { XP_RULES, levelForXp } from './xp'

/**
 * Derive everything shown to the user from the saved state + content.
 * Nothing here is stored: unmarking a food automatically withdraws its XP, challenge and badges,
 * which is what prevents mark/unmark XP farming.
 *
 * Note: `xp_total` challenges compare against base XP (foods + quizzes), not challenge rewards,
 * so rewards can never depend on themselves.
 */
export function computeProgress(state, { foods, categories, challenges, badges }) {
  const known = new Set(foods.map((f) => f.id))
  const triedIds = new Set(state.triedFoodIds.filter((id) => known.has(id)))
  const tried = foods.filter((f) => triedIds.has(f.id))
  const quizCorrect = new Set(state.quizProgress.correctIds).size

  const baseXp =
    tried.reduce((sum, f) => sum + (f.xp ?? XP_RULES.TRY_FOOD), 0) + quizCorrect * XP_RULES.QUIZ_CORRECT

  const collections = buildCollections(foods, categories)
  const ctx = { foods, collections, triedIds, baseXp, challengesCompleted: 0, quizCorrect }

  const challengeResults = challenges
    .filter((c) => c.is_active)
    .map((c) => {
      const r = evaluateRule(c.rules, ctx)
      return { id: c.id, ...r, completed: r.met, xp_reward: c.xp_reward ?? XP_RULES.CHALLENGE }
    })
  const completed = challengeResults.filter((c) => c.completed)
  const challengeXp = completed.reduce((sum, c) => sum + c.xp_reward, 0)

  const badgeCtx = { ...ctx, challengesCompleted: completed.length }
  const badgeResults = badges.map((b) => {
    const r = evaluateRule(b.unlock_rule, badgeCtx)
    return { id: b.id, ...r, earned: r.met }
  })

  const totalXp = baseXp + challengeXp
  return {
    triedIds: [...triedIds],
    triedCount: triedIds.size,
    completionPercent: foods.length === 0 ? 0 : Math.round((triedIds.size / foods.length) * 100),
    baseXp,
    challengeXp,
    totalXp,
    level: levelForXp(totalXp),
    collections: collections.map((c) => ({ ...c, ...collectionProgress(c, triedIds) })),
    challenges: challengeResults,
    completedChallengeIds: completed.map((c) => c.id),
    badges: badgeResults,
    earnedBadgeIds: badgeResults.filter((b) => b.earned).map((b) => b.id),
  }
}

/** What changed between two progress snapshots, for celebration toasts. */
export function diffProgress(before, after) {
  const added = (a, b) => b.filter((id) => !a.includes(id))
  return {
    xpDelta: after.totalXp - before.totalXp,
    leveledUp: after.level.level > before.level.level,
    newLevel: after.level,
    newStampIds: added(before.triedIds, after.triedIds),
    newChallengeIds: added(before.completedChallengeIds, after.completedChallengeIds),
    newBadgeIds: added(before.earnedBadgeIds, after.earnedBadgeIds),
  }
}
