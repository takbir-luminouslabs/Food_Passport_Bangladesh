import { readFileSync } from 'node:fs'

const food = (id, category, regional = false) => ({
  id, category, xp: 10, scope: regional ? 'regional' : 'national',
  region: regional ? { district_en: 'X', district_bn: 'এক্স', division: 'Dhaka' } : null,
})

// Tiny catalogue: street (2), sweets (3, one regional), drinks (1, regional).
export const fixture = {
  categories: [
    { id: 'street_food', name_en: 'Street Food', name_bn: 'স্ট্রিট ফুড' },
    { id: 'sweets_desserts', name_en: 'Sweets', name_bn: 'মিষ্টি' },
    { id: 'drinks', name_en: 'Drinks', name_bn: 'পানীয়' },
    { id: 'empty_cat', name_en: 'Empty', name_bn: 'খালি' },
  ],
  foods: [
    food('s1', 'street_food'), food('s2', 'street_food'),
    food('m1', 'sweets_desserts', true), food('m2', 'sweets_desserts', true), food('m3', 'sweets_desserts'),
    food('d1', 'drinks', true),
  ],
  challenges: [
    { id: 'c-street', xp_reward: 25, is_active: true, rules: { type: 'count_category', category: 'street_food', target: 2 } },
    { id: 'c-xp', xp_reward: 25, is_active: true, rules: { type: 'xp_total', target: 30 } },
    { id: 'c-col', xp_reward: 25, is_active: true, rules: { type: 'complete_collection', target: 1 } },
    { id: 'c-off', xp_reward: 25, is_active: false, rules: { type: 'count_total', target: 1 } },
  ],
  badges: [
    { id: 'b-first', unlock_rule: { type: 'count_total', target: 1 } },
    { id: 'b-ch', unlock_rule: { type: 'challenges_completed', target: 2 } },
    { id: 'b-quiz', unlock_rule: { type: 'quiz_correct', target: 2 } },
  ],
}

const load = (n) => JSON.parse(readFileSync(`public/data/${n}.json`, 'utf8'))
export const realContent = () => ({
  foods: load('foods'), categories: load('categories'), challenges: load('challenges'), badges: load('badges'),
})
