import { useLanguage } from '../hooks/useLanguage'
import { goToStep } from '../utils/journey'
import Icon from './Icon'

const STEPS = [
  ['pick', 'journey.pickShort'],
  ['passport', 'journey.passportShort'],
  ['download', 'journey.downloadShort'],
]

/** The three steps of the flow as a row of numbered buttons. */
export default function JourneySteps() {
  const { t, formatNumber } = useLanguage()
  return (
    <nav aria-label={t('journey.steps')} className="mt-6">
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {STEPS.map(([id, key], i) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => goToStep(id)}
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-center text-sm font-semibold text-primary-dark shadow-sm transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none sm:flex-row sm:gap-2 ${['tint-peach', 'tint-mint', 'tint-sky'][i]}`}
            >
              <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-lime">{formatNumber(i + 1)}</span>
              <span>{t(key)}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** A button at the end of a step that leads to the next one. */
export function NextStep({ to, label }) {
  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={() => goToStep(to)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-lime shadow-md transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none"
      >
        {label}
        <Icon name="arrowRight" className="size-5" />
      </button>
    </div>
  )
}
