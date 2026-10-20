import { useEffect, useMemo } from 'react'
import { useContent } from '../hooks/useContent'
import { useProgress } from '../hooks/useProgress'
import { AppContext } from './app-context'

export function AppProvider({ children, storage, fetchFn }) {
  const { content, status, error, retry } = useContent(fetchFn)
  const store = useProgress(content, storage)
  const { language } = store.state

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => ({ content, status, error, retry, ...store }), [content, status, error, retry, store])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
