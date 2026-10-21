import { planMerge } from './cloudSync'

const mk = (foods, quiz = []) => ({ foods, quiz })

test('union: nothing is dropped from either side, overlap is not duplicated', () => {
  const p = planMerge(mk(['a', 'b'], ['q1']), mk(['b', 'c'], ['q2']))
  expect(p.toCloud).toEqual({ foods: ['a'], quiz: ['q1'] })
  expect(p.toLocal).toEqual({ foods: ['c'], quiz: ['q2'] })
  expect([...p.union.foods].sort()).toEqual(['a', 'b', 'c'])
  expect([...p.union.quiz].sort()).toEqual(['q1', 'q2'])
  expect(p.needsAsk).toBe(true)
})

test('an empty guest passport has nothing to ask about', () => {
  const p = planMerge(mk([]), mk(['x'], ['q']))
  expect(p.needsAsk).toBe(false)
  expect(p.union).toEqual({ foods: ['x'], quiz: ['q'] })
})

test('identical passports need no merge, and duplicate ids are collapsed', () => {
  const p = planMerge(mk(['a', 'a']), mk(['a']))
  expect(p.needsAsk).toBe(false)
  expect(p.toLocal.foods).toEqual([])
  expect(p.union.foods).toEqual(['a'])
})
