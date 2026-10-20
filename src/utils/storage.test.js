import { createInitialState, markTried } from './state'
import {
  STORAGE_KEY, exportState, importState, loadState, resetState, saveState,
} from './storage'

const fakeStorage = () => {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  }
}
const throwingStorage = () => ({
  getItem() { throw new Error('denied') },
  setItem() { throw new Error('quota') },
  removeItem() { throw new Error('denied') },
})

test('first visit creates an initial guest passport', () => {
  expect(loadState(fakeStorage())).toEqual(createInitialState())
})

test('save then load restores state after "refresh"', () => {
  const st = fakeStorage()
  const s = markTried(createInitialState('en'), 'a')
  expect(saveState(s, st)).toBe(true)
  expect(loadState(st)).toEqual(s)
})

test('corrupted JSON does not crash and is backed up, not silently lost', () => {
  const st = fakeStorage()
  st.setItem(STORAGE_KEY, '{not json')
  expect(loadState(st)).toEqual(createInitialState())
  expect(st.getItem(`${STORAGE_KEY}:corrupt`)).toBe('{not json')
})

test('structurally invalid data falls back to a fresh passport', () => {
  const st = fakeStorage()
  st.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }))
  expect(loadState(st)).toEqual(createInitialState())
})

test('unavailable storage (private mode) never throws', () => {
  const st = throwingStorage()
  expect(loadState(st)).toEqual(createInitialState())
  expect(saveState(createInitialState(), st)).toBe(false)
  expect(() => resetState(st)).not.toThrow()
  expect(loadState(undefined)).toEqual(createInitialState())
})

test('resetState clears progress but keeps the language choice', () => {
  const st = fakeStorage()
  saveState(markTried(createInitialState('en'), 'a'), st)
  const fresh = resetState(st, 'en')
  expect(fresh).toEqual(createInitialState('en'))
  expect(loadState(st)).toEqual(createInitialState('en'))
})

describe('export / import backup', () => {
  test('round-trips', () => {
    const s = markTried(createInitialState('en'), 'a')
    expect(importState(exportState(s))).toEqual({ ok: true, state: s })
  })

  test('export contains no personal data beyond progress', () => {
    const parsed = JSON.parse(exportState(markTried(createInitialState(), 'a')))
    expect(Object.keys(parsed).sort()).toEqual(['app', 'data', 'exportedAt'])
    expect(parsed.app).toBe('food-passport-bangladesh')
  })

  test.each([['not json'], ['{}'], [JSON.stringify({ app: 'other', data: createInitialState() })], [JSON.stringify({ app: 'food-passport-bangladesh', data: { version: 99 } })]])(
    'rejects invalid backup %s',
    (text) => {
      const r = importState(text)
      expect(r.ok).toBe(false)
      expect(r.error).toBeTruthy()
    },
  )
})
