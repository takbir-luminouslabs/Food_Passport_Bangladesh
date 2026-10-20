import { useLanguage } from '../hooks/useLanguage'
import Icon from './Icon'

/** Earned and locked badges with their unlock condition and progress. `items` = [{badge, result}]. */
export default function BadgeGrid({ items }) {
  const { t, pick, formatNumber } = useLanguage()
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ badge, result }) => (
        <li
          key={badge.id}
          aria-label={pick(badge, 'name')}
          className={`rounded-2xl p-3 text-center ${result.earned ? 'border-2 border-gold bg-lime/40' : 'border-2 border-dashed border-muted/60 bg-cream'}`}
        >
          <Icon name={result.earned ? 'medal' : 'lock'} className={`mx-auto size-9 ${result.earned ? 'text-gold-dark' : 'text-muted'}`} />
          <p className="font-bold">{pick(badge, 'name')}</p>
          <p className="text-xs text-muted">{pick(badge, 'description')}</p>
          <p className="mt-1 text-xs font-semibold">
            {result.earned && <Icon name="check" className="mr-1 inline size-[1em] align-[-0.125em]" />}
            <span>{result.earned ? t('badge.earned') : t('badge.locked')}</span>
          </p>
          {!result.earned && (
            <p className="text-xs">{formatNumber(Math.min(result.current, result.target))}/{formatNumber(result.target)}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
