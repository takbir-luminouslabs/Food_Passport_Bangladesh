import { useRef } from 'react'
import { tiltFromPointer } from '../utils/passportStyle'

/** Gentle 3D tilt toward the mouse. Skipped on touch and when the user prefers reduced motion. */
export default function TiltSurface({ children, max = 10, className = '' }) {
  const ref = useRef(null)
  const onMove = (e) => {
    if (e.pointerType === 'touch' || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
    const { rx, ry } = tiltFromPointer(ref.current.getBoundingClientRect(), e.clientX, e.clientY, max)
    ref.current.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`transition-transform duration-150 ${className}`}>
      {children}
    </div>
  )
}
