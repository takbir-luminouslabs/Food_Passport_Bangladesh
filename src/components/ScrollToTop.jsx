import { useEffect, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'

/** Floating "back to top" button: appears once the page is scrolled down. */
export default function ScrollToTop() {
  const { t } = useLanguage()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  const toTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }
  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={t('nav.top')}
      className="fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-lime shadow-lg ring-2 ring-white transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-gold md:bottom-6"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  )
}
