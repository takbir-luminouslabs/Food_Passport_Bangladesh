import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'

/**
 * A single-page app does not reload when you move between pages, so screen-reader and keyboard users get nothing.
 * This sets a descriptive document title from the page's h1, announces the new page, and (after the first load)
 * moves focus to the main content at the top.
 */
export default function RouteAnnouncer({ siteName }) {
  const { pathname } = useLocation()
  const { status } = useApp()
  const { language } = useLanguage()
  const [announcement, setAnnouncement] = useState('')
  const first = useRef(true)

  const pageName = () => document.querySelector('main h1')?.textContent?.trim() ?? ''

  // title: follows the page and the language
  useEffect(() => {
    if (status !== 'ready') return
    const name = pageName()
    document.title = name && name !== siteName ? `${name} · ${siteName}` : siteName
  }, [pathname, status, language, siteName])

  // announce + focus: only when the page changes, never on the first load
  useEffect(() => {
    if (status !== 'ready') return
    if (first.current) {
      first.current = false
      return
    }
    setAnnouncement(pageName())
    const main = document.getElementById('main')
    document.documentElement.scrollTop = 0
    main?.focus({ preventScroll: true })
  }, [pathname, status])

  return <p data-testid="route-announcer" aria-live="polite" className="sr-only">{announcement}</p>
}
