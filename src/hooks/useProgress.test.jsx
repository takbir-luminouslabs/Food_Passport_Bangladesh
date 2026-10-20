import { act, renderHook } from '@testing-library/react'
import { fixture } from '../test/fixtures'
import { brokenStorage, fakeStorage } from '../test/storage'
import { loadState, saveState } from '../utils/storage'
import { createInitialState, markTried } from '../utils/state'
import { useProgress } from './useProgress'

const setup = (storage = fakeStorage(), content = fixture) => ({
  storage,
  ...renderHook(() => useProgress(content, storage)),
})

test('starts empty and has no progress until content is loaded', () => {
  const { result } = setup(fakeStorage(), null)
  expect(result.current.progress).toBeNull()
  expect(result.current.state.triedFoodIds).toEqual([])
})

test('restores saved guest progress', () => {
  const storage = fakeStorage()
  saveState(markTried(createInitialState(), 's1'), storage)
  const { result } = setup(storage)
  expect(result.current.progress.triedCount).toBe(1)
  expect(result.current.lastDiff).toBeNull()
})

test('toggleTried marks, persists, and unmarks', () => {
  const { result, storage } = setup()
  act(() => result.current.toggleTried('s1'))
  expect(result.current.progress.totalXp).toBe(10)
  expect(loadState(storage).triedFoodIds).toEqual(['s1'])
  act(() => result.current.toggleTried('s1'))
  expect(result.current.progress.totalXp).toBe(0)
  expect(loadState(storage).triedFoodIds).toEqual([])
})

test('gaining XP publishes a diff for celebrations; unmarking does not', () => {
  const { result } = setup()
  act(() => result.current.toggleTried('s1'))
  expect(result.current.lastDiff).toMatchObject({ xpDelta: 10, newStampIds: ['s1'], newBadgeIds: ['b-first'] })
  act(() => result.current.dismissDiff())
  expect(result.current.lastDiff).toBeNull()
  act(() => result.current.toggleTried('s1'))
  expect(result.current.lastDiff).toBeNull()
})

test('changing language keeps progress and does not trigger a celebration', () => {
  const { result, storage } = setup()
  act(() => result.current.toggleTried('s1'))
  act(() => result.current.dismissDiff())
  act(() => result.current.setLanguage('en'))
  expect(result.current.state.language).toBe('en')
  expect(result.current.progress.totalXp).toBe(10)
  expect(result.current.lastDiff).toBeNull()
  expect(loadState(storage).language).toBe('en')
})

test('reset clears progress but keeps language', () => {
  const { result, storage } = setup()
  act(() => result.current.setLanguage('en'))
  act(() => result.current.toggleTried('s1'))
  act(() => result.current.reset())
  expect(result.current.progress.triedCount).toBe(0)
  expect(loadState(storage)).toEqual(createInitialState('en'))
})

test('backup export then import restores progress', () => {
  const { result } = setup()
  act(() => result.current.toggleTried('s1'))
  const backup = result.current.exportBackup()
  act(() => result.current.reset())
  let r
  act(() => { r = result.current.importBackup(backup) })
  expect(r.ok).toBe(true)
  expect(result.current.progress.triedCount).toBe(1)
})

test('invalid backup is rejected and progress is untouched', () => {
  const { result } = setup()
  act(() => result.current.toggleTried('s1'))
  let r
  act(() => { r = result.current.importBackup('garbage') })
  expect(r.ok).toBe(false)
  expect(result.current.progress.triedCount).toBe(1)
})

test('quiz answers are recorded once', () => {
  const { result } = setup()
  act(() => result.current.recordQuizCorrect('q1'))
  act(() => result.current.recordQuizCorrect('q1'))
  expect(result.current.progress.baseXp).toBe(5)
})

test('storage failure is reported but the app keeps working in memory', () => {
  const { result } = setup(brokenStorage())
  expect(result.current.saveFailed).toBe(true)
  act(() => result.current.toggleTried('s1'))
  expect(result.current.progress.totalXp).toBe(10)
})
