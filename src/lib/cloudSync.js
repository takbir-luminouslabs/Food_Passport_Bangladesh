/** Guest <-> account sync helpers. Pure set maths plus the three calls the site makes to the cloud. */

const uniq = (list) => [...new Set(list)]

/**
 * Compare this browser's passport with the account's. Merging is a union: nothing is ever removed from either side.
 * `toCloud` is what the account is missing, `toLocal` is what this browser is missing.
 */
export function planMerge(local, cloud) {
  const diff = (a, b) => a.filter((id) => !b.includes(id))
  const toCloud = { foods: diff(uniq(local.foods), cloud.foods), quiz: diff(uniq(local.quiz), cloud.quiz) }
  const toLocal = { foods: diff(uniq(cloud.foods), local.foods), quiz: diff(uniq(cloud.quiz), local.quiz) }
  return {
    toCloud,
    toLocal,
    union: { foods: uniq([...local.foods, ...cloud.foods]), quiz: uniq([...local.quiz, ...cloud.quiz]) },
    needsAsk: toCloud.foods.length + toCloud.quiz.length > 0,
  }
}

/** What the signed-in user already has online: stamps and the quiz questions they answered right. */
export async function fetchCloudProgress(client) {
  const [foods, quiz] = await Promise.all([
    client.from('user_food_progress').select('food_id'),
    client.from('xp_events').select('reference_id').eq('event_type', 'quiz_correct'),
  ])
  if (foods.error || quiz.error) throw foods.error ?? quiz.error
  return { foods: foods.data.map((r) => r.food_id), quiz: quiz.data.map((r) => r.reference_id) }
}

/** Add stamps / right answers to the account (idempotent). Resolves with the server summary. */
export async function pushProgress(client, { foods = [], quiz = [] }) {
  const { data, error } = await client.rpc('merge_guest_progress', { p_foods: foods, p_quiz: quiz })
  if (error) throw error
  return data
}

export async function removeStamp(client, foodId) {
  const { error } = await client.rpc('unmark_food_tried', { p_food_id: foodId })
  if (error) throw error
}
