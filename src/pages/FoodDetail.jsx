import { Link, useParams } from 'react-router-dom'
import FoodImage from '../components/FoodImage'
import TriedButton from '../components/TriedButton'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import Icon from '../components/Icon'
import { regionInfo } from '../utils/foods'

export default function FoodDetail() {
  const { foodId } = useParams()
  const { content, progress } = useApp()
  const { language, t, pick, formatNumber } = useLanguage()
  const food = content.foods.find((f) => f.id === foodId)

  if (!food) {
    return (
      <section>
        <h1 className="text-2xl font-bold text-primary">{t('food.notFound')}</h1>
        <Link to="/" state={{ scrollTo: 'pick' }} className="mt-3 inline-flex min-h-11 items-center text-primary underline">{t('food.back')}</Link>
      </section>
    )
  }

  const category = content.categories.find((c) => c.id === food.category)
  const region = regionInfo(food)
  const tried = progress.triedIds.includes(food.id)
  return (
    <article>
      <Link to="/" state={{ scrollTo: 'pick' }} className="inline-flex min-h-11 items-center gap-1 text-sm text-primary underline"><Icon name="arrowLeft" className="size-4" />{t('food.back')}</Link>
      <FoodImage food={food} alt={pick(food, 'name')} className="mt-3 h-56 w-full rounded-2xl" />
      {food.image_attribution && <p className="mt-1 text-xs text-muted">{t('food.photoCredit')}: {food.image_attribution}</p>}
      <h1 className="mt-4 text-3xl font-bold text-primary">{pick(food, 'name')}</h1>
      <p lang={language === 'bn' ? 'en' : 'bn'} className="text-muted">
        {language === 'bn' ? food.name_en : food.name_bn}
      </p>
      <p className="mt-3">{pick(food, 'description')}</p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="card-soft p-4">
          <dt className="text-muted">{t('food.categoryLabel')}</dt>
          <dd><Icon name={food.category} className="mr-1 inline size-[1em] align-[-0.125em]" />{pick(category, 'name')}</dd>
        </div>
        <div className="card-soft p-4">
          <dt className="text-muted">XP</dt>
          <dd>{t('food.xpReward', { n: formatNumber(food.xp) })}</dd>
        </div>
        <div className="card-soft p-4">
          <dt className="text-muted">{t('stamp.collected')}</dt>
          <dd><Icon name={tried ? 'check' : 'lock'} className="mr-1 inline size-[1em] align-[-0.125em]" />{tried ? t('stamp.collected') : t('stamp.locked')}</dd>
        </div>
        {region && (
          <div className="card-soft p-4">
            <dt className="text-muted"><Icon name="pin" className="size-[1em] align-[-0.125em]" /><span className="sr-only">{t('food.regionLabel')}</span></dt>
            <dd>
              {t('food.region', { district: pick(region, 'district') })}
              {!region.verified && <span className="block text-xs text-muted">{t('food.unverified')}</span>}
            </dd>
          </div>
        )}
        {food.source_url && (
          <div className="card-soft p-4">
            <dt className="text-muted">{t('food.source')}</dt>
            <dd>
              <a href={food.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">
                {new URL(food.source_url).hostname}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5"><TriedButton food={food} /></div>
      <p className="mt-3 text-xs text-muted">{t('tracking.disclaimer')}</p>
    </article>
  )
}
