import { Link } from 'react-router-dom'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import { regionInfo } from '../utils/foods'
import Icon from './Icon'
import FoodImage from './FoodImage'
import TriedButton from './TriedButton'

/** `as` is the heading level: h3 inside a section, h2 when the cards sit directly under the page title. */
export default function FoodCard({ food, as: Heading = 'h3' }) {
  const { content, progress } = useApp()
  const { language, t, pick, formatNumber } = useLanguage()
  const category = content.categories.find((c) => c.id === food.category)
  const region = regionInfo(food)
  const tried = progress.triedIds.includes(food.id)
  const otherName = language === 'bn' ? food.name_en : food.name_bn
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm">
      <Link to={`/discover/${food.id}`} className="block">
        <FoodImage food={food} alt={pick(food, 'name')} className="h-36 w-full" />
        <div className="px-4 pt-3">
          <Heading className="text-lg font-bold text-primary">{pick(food, 'name')}</Heading>
          <p lang={language === 'bn' ? 'en' : 'bn'} className="text-sm text-muted">{otherName}</p>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-2">
        <p className="text-sm">{pick(food, 'description')}</p>
        <ul className="flex flex-wrap gap-2 text-xs">
          <li className="rounded-full bg-cream px-2 py-1">
            <Icon name={food.category} className="mr-1 inline size-[1em] align-[-0.125em]" />
            {pick(category, 'name')}
          </li>
          {region && <li className="rounded-full bg-cream px-2 py-1"><Icon name="pin" className="mr-1 inline size-[1em] align-[-0.125em]" />{pick(region, 'district')}</li>}
          <li className="rounded-full bg-cream px-2 py-1">+{formatNumber(food.xp)} XP</li>
          <li className={`rounded-full px-2 py-1 ${tried ? 'bg-primary text-lime' : 'bg-cream'}`}>
            <Icon name={tried ? 'check' : 'lock'} className="mr-1 inline size-[1em] align-[-0.125em]" />
            {tried ? t('stamp.collected') : t('stamp.locked')}
          </li>
        </ul>
        <div className="mt-auto pt-2">
          <TriedButton food={food} />
        </div>
      </div>
    </article>
  )
}
