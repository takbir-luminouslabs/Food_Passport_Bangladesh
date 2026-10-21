import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import BadgeGrid from '../components/BadgeGrid'
import ChallengeCard from '../components/ChallengeCard'
import DataSection from '../components/DataSection'
import DonationSection from '../components/DonationSection'
import FoodPicker from '../components/FoodPicker'
import JourneySteps, { NextStep } from '../components/JourneySteps'
import PassportBook from '../components/PassportBook'
import ShareCard from '../components/ShareCard'
import ProgressBar from '../components/ProgressBar'
import Icon from '../components/Icon'
import HeroCollage from '../components/HeroCollage'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import { validBkashNumber } from '../utils/donation'
import { goToStep } from '../utils/journey'
import { nextChallenges } from '../utils/recommend'
import { LEVELS } from '../utils/xp'

function Section({ id, title, action, children }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-2xl font-extrabold text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** One numbered step of the flow. The section's own id is what the stepper scrolls to. */
function Step({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12 scroll-mt-20">
      <h2 id={`${id}-h`} tabIndex={-1} className="mb-4 text-2xl font-extrabold text-primary outline-none">{title}</h2>
      {children}
    </section>
  )
}

export default function Home() {
  const { content, progress } = useApp()
  const { t, pick, formatNumber } = useLanguage()
  const returning = progress.triedCount > 0
  const { level } = progress
  const nextLevel = LEVELS[level.level]
  const [, setParams] = useSearchParams()
  const { state } = useLocation()
  // old links (/discover, /passport) arrive here asking for a step
  useEffect(() => {
    if (state?.scrollTo) goToStep(state.scrollTo)
  }, [state])
  const challenges = nextChallenges(progress.challenges, 2)
  const badgeItems = content.badges
    .map((badge) => ({ badge, result: progress.badges.find((b) => b.id === badge.id) }))
    .sort((a, b) => Number(b.result.earned) - Number(a.result.earned))
    .slice(0, 4)

  const stats = [
    [t('stats.foodsTried'), formatNumber(progress.triedCount)],
    [t('stats.totalXp'), formatNumber(progress.totalXp)],
    [t('stats.level'), pick(level, 'name')],
    [t('stats.badges'), formatNumber(progress.earnedBadgeIds.length)],
    [t('stats.completion'), `${formatNumber(progress.completionPercent)}%`],
  ]

  return (
    <div>
      <section data-testid="hero" className="hero-panel">
        <div className="grid items-center gap-8 px-5 py-8 md:grid-cols-[1fr_1.05fr] md:gap-10 md:px-10 md:py-12">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold text-gold-dark">{t('hero.badge')}</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-primary sm:text-4xl lg:text-5xl">{t('brand.name')}</h1>
            <h2 className="mt-3 text-xl text-primary-dark">{t('hero.title')}</h2>
            <p className="mt-2 max-w-md text-muted md:max-w-none">{returning ? t('brand.tagline') : t('hero.onboarding')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
              <button type="button" onClick={() => goToStep('pick')} className="inline-flex min-h-12 items-center rounded-lg bg-primary px-7 font-semibold text-lime transition-colors hover:bg-primary-dark">
                {returning ? t('cta.continue') : t('cta.start')}
              </button>
              <button type="button" onClick={() => goToStep('download')} className="inline-flex min-h-12 items-center rounded-lg border-2 border-primary px-6 font-semibold text-primary transition-colors hover:bg-primary/5">
                {t('share.passport')}
              </button>
            </div>
          </div>
          <HeroCollage />
        </div>
      </section>

      <JourneySteps />

      <nav aria-label={t('home.categories')} className="mt-6">
        <ul className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {content.categories.filter((c) => content.foods.some((f) => f.category === c.id)).map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setParams((prev) => { const next = new URLSearchParams(prev); next.set('cat', c.id); return next }, { replace: true })
                  goToStep('pick')
                }}
                className={`pill-bounce inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-dark shadow-sm transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none ${['tint-peach', 'tint-mint', 'tint-sky', 'tint-lavender', 'tint-sunny'][i % 5]}`}
              >
                <Icon name={c.id} className="size-5" strokeWidth={6} />
                {pick(c, 'name')}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Step id="pick" title={t('journey.pick')}>
        <FoodPicker />
        <NextStep to="passport" label={t('journey.next.passport')} />
      </Step>

      <Step id="passport" title={t('journey.passport')}>
        <p className="-mt-2 mb-4 text-muted">
          {t('passport.summary', { tried: formatNumber(progress.triedCount), total: formatNumber(content.foods.length) })}
        </p>
        <PassportBook />
        <NextStep to="download" label={t('journey.next.download')} />
      </Step>

      <Step id="download" title={t('journey.download')}>
        <ShareCard />
      </Step>

      <Section id="home-progress" title={t('home.progress')}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(([label, value], i) => (
            <div key={label} className={`rounded-3xl p-4 ${['tint-peach', 'tint-mint', 'tint-sky', 'tint-lavender', 'tint-sunny'][i % 5]}`}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-lg font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3">
          <ProgressBar value={Math.round(level.progress * 100)} max={100} label={t('stats.level')} />
          <p className="mt-1 text-sm text-muted">
            {nextLevel
              ? t('stats.xpToNext', { xp: formatNumber(level.xpToNext), level: pick(nextLevel, 'name') })
              : t('stats.maxLevel')}
          </p>
        </div>
        <p className="mt-2 text-sm">{t('xp.howTo')}</p>
      </Section>

      {challenges.length > 0 && (
        <Section id="home-challenge" title={t('home.nextChallenge')}>
          <div className="grid gap-4 md:grid-cols-2">
            {challenges.map((r) => (
              <ChallengeCard key={r.id} result={r} challenge={content.challenges.find((c) => c.id === r.id)} />
            ))}
          </div>
        </Section>
      )}

      <Section id="home-badges" title={t('home.badges')}>
        <BadgeGrid items={badgeItems} />
      </Section>

      <div className="mt-10"><DataSection /></div>

      <div className="mt-8">
        <DonationSection t={t} number={validBkashNumber(import.meta.env.VITE_BKASH_NUMBER)} />
      </div>
    </div>
  )
}
