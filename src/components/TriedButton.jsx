import Icon from './Icon'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'

export default function TriedButton({ food }) {
  const { progress, toggleTried } = useApp()
  const { t, pick } = useLanguage()
  const tried = progress.triedIds.includes(food.id)
  return (
    <button
      type="button"
      aria-pressed={tried}
      aria-label={`${tried ? t('food.tried') : t('food.markTried')}: ${pick(food, 'name')}`}
      onClick={() => toggleTried(food.id)}
      className={`min-h-11 rounded-full border-2 border-primary px-4 text-sm font-semibold ${tried ? 'bg-primary text-lime' : 'bg-card text-primary'}`}
    >
      {tried && <Icon name="check" className="mr-1 inline size-[1em] align-[-0.125em]" />}
      {tried ? t('food.tried') : t('food.markTried')}
    </button>
  )
}
