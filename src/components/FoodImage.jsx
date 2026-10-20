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
      className={`flex items-center justify-center bg-gradient-to-br from-lime/60 to-gold/40 ${className}`}
    >
      <Icon name={food.category} className="size-14 text-primary/70" strokeWidth={5} />
    </div>
  )
}
