import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeProgress, diffProgress } from '../utils/scoring'
import {
  markTried, recordQuizCorrect, setLanguage as setLang, setPersonalityResult, unmarkTried,
} from '../utils/state'
import { exportState, importState, loadState, resetState, saveState } from '../utils/storage'

/**
 * Guest passport: persisted state + derived progress.
 * `storage` is injectable for tests; defaults to window.localStorage.
 * State is saved synchronously whenever it changes (in the event handler, not an effect).
 */
export function useProgress(content, storage) {
  const [store, setStore] = useState(() => {
    const state = loadState(storage)
    return { state, saveFailed: !saveState(state, storage) }
  })
  const [lastDiff, setLastDiff] = useState(null)
  const latest = useRef(store.state)
  const prevProgress = useRef(null)
  const { state, saveFailed } = store

  const progress = useMemo(() => (content ? computeProgress(state, content) : null), [state, content])

  // Publish a celebration diff only when something was gained (not on load, unmark, or language change).
  useEffect(() => {
    if (!progress) return
    const prev = prevProgress.current
    prevProgress.current = progress
    if (!prev) return
    const d = diffProgress(prev, progress)
    if (d.xpDelta > 0 || d.newStampIds.length || d.newBadgeIds.length || d.newChallengeIds.length) setLastDiff(d)
  }, [progress])

  const commit = useCallback(
    (next) => {
      latest.current = next
      setStore({ state: next, saveFailed: !saveState(next, storage) })
    },
    [storage],
  )
  const update = useCallback((fn) => commit(fn(latest.current)), [commit])

  const toggleTried = useCallback(
    (foodId) => update((s) => (s.triedFoodIds.includes(foodId) ? unmarkTried(s, foodId) : markTried(s, foodId))),
    [update],
  )
  const setLanguage = useCallback((lang) => update((s) => setLang(s, lang)), [update])
  const recordQuiz = useCallback((qid) => update((s) => recordQuizCorrect(s, qid)), [update])
  const setPersonality = useCallback((id) => update((s) => setPersonalityResult(s, id)), [update])
  const dismissDiff = useCallback(() => setLastDiff(null), [])

  const reset = useCallback(() => {
    commit(resetState(storage, latest.current.language))
    setLastDiff(null)
  }, [commit, storage])

  const importBackup = useCallback(
    (text) => {
      const result = importState(text)
      if (result.ok) commit(result.state)
      return result
    },
    [commit],
  )
  const exportBackup = useCallback(() => exportState(latest.current), [])

  return {
    state, progress, lastDiff, saveFailed,
    toggleTried, setLanguage, recordQuizCorrect: recordQuiz, setPersonalityResult: setPersonality,
    dismissDiff, reset, importBackup, exportBackup,
  }
}
