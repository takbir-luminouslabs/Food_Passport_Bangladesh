import { useApp } from '../context/app-context'
import { useHolderPhoto } from '../context/holder-photo-context'
import { useLanguage } from '../hooks/useLanguage'
import { mrzLine } from '../utils/passportStyle'
import Emblem from './Emblem'

/** The holder's data page: emblem "photo", level, XP, stamps and a decorative machine-readable line. */
export default function DataPage({ side = null }) {
  const { content, progress } = useApp()
  const { t, pick, formatNumber } = useLanguage()
  const photo = useHolderPhoto()
  const holderName = photo.name.replace(/\s+/g, ' ').trim()
  const rows = [
    [t('share.field.name'), holderName || t('share.holderDefault')],
    [t('stats.level'), `${formatNumber(progress.level.level)} · ${pick(progress.level, 'name')}`],
    [t('stats.totalXp'), formatNumber(progress.totalXp)],
    [t('passport.stamps'), `${formatNumber(progress.triedCount)}/${formatNumber(content.foods.length)}`],
    [t('share.field.nationality'), t('share.nationality')],
  ]
  return (
    <section aria-label={t('book.dataPage')} className={`visa-page ${side ? `visa-page--${side}` : ''}`}>
      <p className="font-serif text-xl font-bold text-[#b98a2e]">{t('brand.name')}</p>
      <div className="mt-3 flex gap-4">
        <div className="passport-photo flex h-36 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          {photo.url ? (
            <img src={photo.url} alt={t('photo.alt')} className="h-full w-full object-cover" />
          ) : (
            <Emblem className="foil-icon size-20" />
          )}
        </div>
        <dl className="min-w-0 space-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="truncate font-bold text-primary-dark">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-auto pt-4">
        <p data-mrz aria-hidden="true" className="mrz">{mrzLine('FOOD<<PASSPORT<<EXPLORER')}</p>
        <p data-mrz aria-hidden="true" className="mrz">{mrzLine(`${progress.triedCount}<${progress.totalXp}<${progress.level.level}`)}</p>
      </div>
    </section>
  )
}
