/** Fisher-Yates shuffle (returns a new array). `random` is injectable for tests. */
export function shuffle(items, random = Math.random) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * A fresh round: the questions in random order, each with its options in random order (`correct` re-pointed).
 * Every option keeps its `index` in quiz.json, which is what the server compares against its own copy of the answer.
 */
export function buildRound(questions, random = Math.random) {
  return shuffle(questions, random).map((q) => {
    const order = shuffle(q.options.map((_, i) => i), random)
    return { ...q, options: order.map((i) => ({ ...q.options[i], index: i })), correct: order.indexOf(q.correct) }
  })
}
