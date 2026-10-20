import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { INKS, stampStyle } from '../utils/passportStyle'
import { iconSvgPath } from '../utils/stampIcons'
import Icon from './Icon'

/** Collected = inked rubber stamp (own shape and ink, tilted, tick, "Collected"); locked = empty dashed slot (lock, "Locked"). */
export default function PassportStamp({ food, tried }) {
  const { t, pick } = useLanguage()
  const style = tried ? stampStyle(food.id) : null
  return (
    <Link
      to={`/discover/${food.id}`}
      data-shape={style?.shape}
      style={style ? { transform: `rotate(${style.tilt}deg)`, '--stamp-ink': INKS[style.ink] } : undefined}
      className={`flex min-h-24 flex-col items-center justify-center gap-1 p-2 text-center ${tried ? 'stamp-ink' : 'stamp-slot'}`}
    >
      {tried ? (
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="size-9" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconSvgPath(food.category)} />
        </svg>
      ) : (
        <Icon name="lock" className="size-8" />
      )}
      <span className="text-sm font-semibold leading-tight">{pick(food, 'name')}</span>
      {food.region && <span className="text-xs leading-tight opacity-80">{pick(food.region, 'district')}</span>}
      <span className="text-xs">
        {tried && <Icon name="check" className="mr-0.5 inline size-[1em] align-[-0.125em]" />}
        <span>{tried ? t('stamp.collected') : t('stamp.locked')}</span>
      </span>
    </Link>
  )
}
