import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { INKS, stampStyle } from '../utils/passportStyle'
import Icon from './Icon'
import Seal from './Seal'

/**
 * Collected = a round inked seal (tilted, name and district on the ring); locked = an empty dashed slot with a lock,
 * the food's name and its district. Every stamp links to the food.
 */
export default function PassportStamp({ food, tried }) {
  const { t, pick } = useLanguage()
  const name = pick(food, 'name')
  const district = food.region ? pick(food.region, 'district') : ''
  if (tried) {
    const { ink, tilt } = stampStyle(food.id)
    return (
      <Link
        to={`/discover/${food.id}`}
        data-food-id={food.id}
        data-shape="round"
        style={{ transform: `rotate(${tilt}deg)` }}
        className="stamp-seal mx-auto block w-full max-w-[8.5rem] rounded-full"
      >
        <Seal name={name} district={district} category={food.category} image={food.image_url} ink={INKS[ink]} className="block w-full" />
        <span className="sr-only">{[name, district, t('stamp.collected')].filter(Boolean).join(', ')}</span>
      </Link>
    )
  }
  return (
    <Link to={`/discover/${food.id}`} data-food-id={food.id} className="stamp-slot flex min-h-24 flex-col items-center justify-center gap-1 p-2 text-center">
      <Icon name="lock" className="size-8" />
      <span className="text-sm font-semibold leading-tight">{name}</span>
      {district && <span className="text-xs leading-tight opacity-80">{district}</span>}
      <span className="text-xs">{t('stamp.locked')}</span>
    </Link>
  )
}
