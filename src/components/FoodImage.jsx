import { useState } from 'react'
import Icon from './Icon'

/** Food photo with a designed fallback (missing URL or failed load). Fallback is decorative. */
export default function FoodImage({ food, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (food.image_url && !failed) {
    return (
      <img
        src={food.image_url}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <div
      data-fallback
      aria-hidden="true"
      className={`relative flex items-center justify-center bg-gradient-to-br from-lime/60 to-gold/40 ${className}`}
    >
      <Icon name={food.category} className="size-14 text-primary/70" strokeWidth={5} />
      <svg viewBox="0 0 40 24" focusable="false" className="absolute left-1/2 top-[14%] h-6 w-10 -translate-x-1/2 text-primary/40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M13 22 q-6 -7 0 -14" className="scene-steam" />
        <path d="M27 22 q6 -7 0 -14" className="scene-steam scene-steam-late" />
      </svg>
    </div>
  )
}
