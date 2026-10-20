import { useLanguage } from '../hooks/useLanguage'
import { mrzLine } from '../utils/passportStyle'
import Icon from './Icon'
import PassportStamp from './PassportStamp'
import ProgressBar from './ProgressBar'

/**
 * One passport page: up to six stamps of a collection (`foodIds`; all of it when omitted). A collection spread over
 * several pages shows "n/total". `onEnlarge` makes it click-to-float; `large` is the floated copy.
 */
export default function VisaPage({ collection, index, foods, triedIds, onEnlarge, large = false, side = null, foodIds = collection.foodIds, part = 1, parts = 1 }) {
  const { language, t, pick, formatNumber } = useLanguage()
  const headingId = `${large ? 'zoom-' : ''}collection-${collection.id}-${part}`
  const baseName = pick(collection, 'name')
  const name = parts > 1 ? `${baseName} · ${formatNumber(part)}/${formatNumber(parts)}` : baseName
  const onClick = (e) => {
    if (onEnlarge && !e.target.closest('a,button,input,label')) onEnlarge()
  }
  return (
    <section aria-labelledby={headingId} onClick={onClick} className={`visa-page ${side ? `visa-page--${side}` : ''} ${onEnlarge ? 'cursor-zoom-in' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-bold text-muted ${language === 'en' ? 'uppercase tracking-[0.25em]' : ''}`}>
          {t('passport.page', { n: formatNumber(index + 1, { minimumIntegerDigits: 2 }) })}
        </p>
        {onEnlarge && (
          <button
            type="button"
            onClick={onEnlarge}
            aria-label={t('passport.page.enlarge', { name })}
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-primary"
          >
            <Icon name="expand" className="size-5" />
          </button>
        )}
      </div>
      <h3 id={headingId} className="font-serif text-xl font-bold text-primary">
        <Icon name={collection.id} className="mr-1.5 inline size-[0.9em] align-[-0.1em]" />{name}
      </h3>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span>{formatNumber(collection.collected)}/{formatNumber(collection.total)}</span>
        <span>{formatNumber(collection.percent)}%</span>
        {collection.complete && (
          <strong className="text-primary"><Icon name="medal" className="mr-1 inline size-[1em] align-[-0.125em]" />{t('passport.collectionComplete')}</strong>
        )}
      </div>
      <div className="mt-2"><ProgressBar value={collection.percent} max={100} label={baseName} /></div>
      <ul className={`mt-3 grid gap-2 ${large ? 'grid-cols-3 gap-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-3'}`}>
        {foodIds.map((id) => {
          const food = foods.find((f) => f.id === id)
          return food ? <li key={id}><PassportStamp food={food} tried={triedIds.has(id)} /></li> : null
        })}
      </ul>
      <p data-mrz aria-hidden="true" className="mrz mt-auto pt-4">{mrzLine(`FOOD<<PASSPORT<<${collection.id}`)}</p>
    </section>
  )
}
