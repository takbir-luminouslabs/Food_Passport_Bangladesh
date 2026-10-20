import { useCallback, useEffect, useState } from 'react'
import { loadContent } from '../lib/content'

export function useContent(fetchFn) {
  const [result, setResult] = useState({ status: 'loading', content: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadContent(fetchFn)
      .then((content) => !cancelled && setResult({ status: 'ready', content, error: null }))
      .catch((error) => !cancelled && setResult({ status: 'error', content: null, error }))
    return () => {
      cancelled = true
    }
  }, [fetchFn, attempt])

  const retry = useCallback(() => {
    setResult({ status: 'loading', content: null, error: null })
    setAttempt((n) => n + 1)
  }, [])

  return { ...result, retry }
}
