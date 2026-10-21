import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { computeProgress } from '../src/utils/scoring'
import { XP_RULES } from '../src/utils/xp'

const load = (n) => JSON.parse(readFileSync(`public/data/${n}.json`, 'utf8'))
const scenario = JSON.parse(readFileSync('supabase/tests/scenario.json', 'utf8'))

// supabase/tests/xp.test.sql runs this same scenario against the database and expects these same answers.
test('the guest app and the cloud functions agree on XP, challenges and badges for the shared scenario', () => {
  const p = computeProgress(
    { triedFoodIds: scenario.foods, quizProgress: { correctIds: scenario.quizCorrect } },
    { foods: load('foods'), categories: load('categories'), challenges: load('challenges'), badges: load('badges') },
  )
  expect(p.completedChallengeIds.sort()).toEqual([...scenario.challenges].sort())
  expect(p.earnedBadgeIds.sort()).toEqual([...scenario.badges].sort())
  expect(p.totalXp).toBe(scenario.totalXp)
})

test('the XP amounts hard-coded in the SQL match the site\'s rules', () => {
  const sql = readFileSync('supabase/migrations/20261021000002_trusted_xp.sql', 'utf8')
  expect(XP_RULES.QUIZ_CORRECT).toBe(5)
  expect(sql).toContain("values (v_user, 'quiz_correct', p_question_id, 5)")
  const challenges = load('challenges')
  expect(challenges.every((c) => c.xp_reward === XP_RULES.CHALLENGE)).toBe(true)
})

test('the scenario\'s quiz answers are the right options in quiz.json', () => {
  const quiz = load('quiz')
  for (const id of scenario.quizCorrect) expect(scenario.quizOptions[id]).toBe(quiz.find((q) => q.id === id).correct)
})
