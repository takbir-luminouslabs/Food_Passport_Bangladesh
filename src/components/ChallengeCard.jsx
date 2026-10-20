import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { challengeLink } from '../utils/recommend'
import Icon from './Icon'
import ProgressBar from './ProgressBar'

/** `challenge` = content entry, `result` = progress.challenges entry for the same id. */
/** `as` is the heading level: h3 inside a section, h2 when the cards sit directly under the page title. */
export default function ChallengeCard({ challenge, result, as: Heading = 'h3' }) {
  const { t, pick, formatNumber } = useLanguage()
  const headingId = `challenge-${challenge.id}`
  const link = challengeLink(challenge.rules)
  const shown = Math.min(result.current, result.target)
  return (
    <article aria-labelledby={headingId} className={`p-4 ${result.completed ? 'rounded-3xl border-2 border-gold bg-lime/40' : 'card-soft'}`}>
      <div className="flex items-start justify-between gap-2">
        <Heading id={headingId} className="text-lg font-bold text-primary">{pick(challenge, 'title')}</Heading>
        <span className="rounded-full bg-cream px-2 py-1 text-xs">{t(`challenge.type.${challenge.challenge_type}`)}</span>
      </div>
      <p className="mt-1 text-sm">{pick(challenge, 'description')}</p>
      <p className="mt-1 text-xs text-muted">{t('challenge.reward', { n: formatNumber(challenge.xp_reward) })}</p>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="font-semibold">{t('challenge.progress')}</span>
        <span>{formatNumber(shown)}/{formatNumber(result.target)}</span>
        {result.completed && <strong className="text-primary"><Icon name="check" className="mr-1 inline size-[1em] align-[-0.125em]" />{t('challenge.completed')}</strong>}
      </div>
      <div className="mt-2"><ProgressBar value={shown} max={result.target} label={pick(challenge, 'title')} /></div>
      {!result.completed && (
        <Link to={link.to} className="mt-3 inline-flex min-h-11 items-center text-sm text-primary underline">{t(link.labelKey)}</Link>
      )}
    </article>
  )
}
