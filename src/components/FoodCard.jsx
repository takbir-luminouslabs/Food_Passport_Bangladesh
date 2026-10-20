import { Link } from 'react-router-dom'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import Icon from './Icon'
import FoodImage from './FoodImage'
import TriedButton from './TriedButton'

/** Compact tile: one district's food. `as` is the heading level of the food name. */
export default function FoodCard({ food, as: Heading = 'h4' }) {
  const { progress } = useApp()
  const { language, t, pick } = useLanguage()
  const tried = progress.triedIds.includes(food.id)
  const otherName = language === 'bn' ? food.name_en : food.name_bn
  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-2xl border transition-transform motion-safe:hover:-translate-y-0.5 ${tried ? 'border-primary bg-lime/30' : 'border-primary/15 bg-card'}`}>
      <Link to={`/discover/${food.id}`} className="block">
        <div className="relative">
          <FoodImage food={food} alt={pick(food, 'name')} className="aspect-[4/3] w-full" />
          {tried && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-lime"><Icon name="check" className="size-[1em]" />{t('stamp.collected')}</span>}
        </div>
        <div className="px-3 pt-2">
          <p className="flex items-center gap-1 text-xs font-semibold text-muted"><Icon name="pin" className="size-[1em] shrink-0" />{food.region ? pick(food.region, 'district') : ''}</p>
          <Heading className="text-sm font-bold leading-snug text-primary">{pick(food, 'name')}</Heading>
          <span lang={language === 'bn' ? 'en' : 'bn'} className="block text-xs text-muted">{otherName}</span>
        </div>
      </Link>
      <div className="mt-auto p-3 pt-2">
        <TriedButton food={food} />
      </div>
    </article>
  )
}
