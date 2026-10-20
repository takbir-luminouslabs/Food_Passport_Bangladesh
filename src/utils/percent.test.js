import { percentTried } from './percent'

test('whole-number percentage of the catalogue that was tried', () => {
  expect(percentTried(0, 64)).toBe(0)
  expect(percentTried(16, 64)).toBe(25)
  expect(percentTried(64, 64)).toBe(100)
  expect(percentTried(1, 64)).toBe(2)
})

test('never leaves 0..100, whatever it is given', () => {
  expect(percentTried(5, 0)).toBe(0)
  expect(percentTried(99, 64)).toBe(100)
  expect(percentTried(-3, 64)).toBe(0)
  expect(percentTried(Number.NaN, 64)).toBe(0)
})
