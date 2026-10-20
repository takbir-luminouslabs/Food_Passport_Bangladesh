import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Floating "enlarge" viewer. Modal dialog: focus moves in and is trapped, Esc / backdrop / close button
 * dismiss it, page scroll is locked, and focus returns to whatever opened it.
 */
export default function ZoomDialog({ label, closeLabel, onClose, widthClass = 'max-w-3xl', children }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const nodes = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (!dialogRef.current.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus?.()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[60] flex overflow-y-auto p-4">
      <div data-testid="zoom-backdrop" aria-hidden="true" onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={label} className={`float-up relative z-10 m-auto w-full ${widthClass}`}>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute -right-2 -top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-cream text-lg text-primary-dark shadow-lg"
        >
          <Icon name="close" className="size-5" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
