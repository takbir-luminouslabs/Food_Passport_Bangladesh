import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** HashRouter does not scroll to in-page anchors (e.g. /privacy#sources), so do it manually. */
export function useScrollToHash() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.()
  }, [hash])
}
