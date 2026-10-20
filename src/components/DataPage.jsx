import { useApp } from '../context/app-context'
import { useHolderPhoto } from '../context/holder-photo-context'
import { useLanguage } from '../hooks/useLanguage'
import { mrzLine } from '../utils/passportStyle'
import { percentTried } from '../utils/percent'
import Emblem from './Emblem'
import ProgressBar from './ProgressBar'

/** The holder's data page: photo, name, how much of Bangladesh was tried, stamps, and a decorative machine-readable line. */
export default function DataPage({ side = null }) {
  const { content, progress } = useApp()
  const { t, formatNumber } = useLanguage()
  const photo = useHolderPhoto()
  const holderName = photo.name.replace(/\s+/g, ' ').trim()
  const total = content.foods.length
  const percent = percentTried(progress.triedCount, total)
  const rows = [
    [t('share.field.name'), holderName || t('share.holderDefault')],
    [t('book.percentLabel'), `${formatNumber(percent)}%`],
    [t('passport.stamps'), `${formatNumber(progress.triedCount)}/${formatNumber(total)}`],
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
      <div className="mt-4">
        <ProgressBar value={percent} max={100} label={t('book.percentLabel')} />
        <p className="mt-1 text-xs text-muted">{t('book.percentOf', { tried: formatNumber(progress.triedCount), total: formatNumber(total) })}</p>
      </div>
      <div className="mt-auto pt-4">
        <p data-mrz aria-hidden="true" className="mrz">{mrzLine('FOOD<<PASSPORT<<EXPLORER')}</p>
        <p data-mrz aria-hidden="true" className="mrz">{mrzLine(`${progress.triedCount}<${total}<${percent}`)}</p>
      </div>
    </section>
  )
}
