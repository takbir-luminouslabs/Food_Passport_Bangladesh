export const XP_RULES = Object.freeze({ TRY_FOOD: 10, CHALLENGE: 25, QUIZ_CORRECT: 5 })

export const LEVELS = Object.freeze([
  { level: 1, threshold: 0, name_en: 'Curious Eater', name_bn: 'কৌতূহলী ভোজনরসিক' },
  { level: 2, threshold: 100, name_en: 'Food Explorer', name_bn: 'খাদ্য অনুসন্ধানী' },
  { level: 3, threshold: 300, name_en: 'Taste Adventurer', name_bn: 'স্বাদ অভিযাত্রী' },
  { level: 4, threshold: 700, name_en: 'Flavour Master', name_bn: 'স্বাদ-মাস্টার' },
  { level: 5, threshold: 1500, name_en: 'Bangladesh Food Legend', name_bn: 'বাংলাদেশ ফুড লেজেন্ড' },
])

/** Level info for a total XP value. Invalid input is treated as 0 XP. */
export function levelForXp(totalXp) {
  const xp = Number.isFinite(totalXp) && totalXp > 0 ? Math.floor(totalXp) : 0
  let idx = 0
  LEVELS.forEach((l, i) => {
    if (xp >= l.threshold) idx = i
  })
  const current = LEVELS[idx]
  const next = LEVELS[idx + 1]
  return {
    ...current,
    xp,
    nextLevelXp: next ? next.threshold : null,
    xpToNext: next ? next.threshold - xp : 0,
    progress: next ? (xp - current.threshold) / (next.threshold - current.threshold) : 1,
  }
}
