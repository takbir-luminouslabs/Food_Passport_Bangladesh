import { Link } from 'react-router-dom'
import BadgeGrid from '../components/BadgeGrid'
import ChallengeCard from '../components/ChallengeCard'
import DonationSection from '../components/DonationSection'
import FoodCard from '../components/FoodCard'
import PassportCoverButton from '../components/PassportCoverButton'
import ProgressBar from '../components/ProgressBar'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import { validBkashNumber } from '../utils/donation'
import { nextChallenges, recommendFoods } from '../utils/recommend'
import { LEVELS } from '../utils/xp'

function Section({ id, title, action, children }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-xl font-bold">{title}</h2>
        {action}
      </div>
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
  const tried = new Set(progress.triedIds)

  const recommended = recommendFoods(content.foods, content.categories, tried, 4)
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
  const viewAll = (to) => <Link to={to} className="inline-flex min-h-11 items-center text-sm text-primary underline">{t('home.viewAll')}</Link>

  return (
    <div>
      <section className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="mx-auto md:mx-0"><PassportCoverButton /></div>
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">{t('brand.name')}</h1>
          <h2 className="mt-1 text-xl">{t('hero.title')}</h2>
          <p className="mt-2 text-muted">{returning ? t('brand.tagline') : t('hero.onboarding')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/discover" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-lime">
              {returning ? t('cta.continue') : t('cta.start')}
            </Link>
            <Link to="/passport#share" className="inline-flex min-h-11 items-center rounded-full border-2 border-primary px-6 font-semibold text-primary">
              {t('share.passport')}
            </Link>
          </div>
        </div>
      </section>

      <Section id="home-progress" title={t('home.progress')}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-card p-3">
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

      <Section id="home-recommended" title={t('home.recommended')} action={viewAll('/discover')}>
        {recommended.length === 0 ? (
          <p>{t('home.allTried')}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((f) => <li key={f.id}><FoodCard food={f} /></li>)}
          </ul>
        )}
      </Section>

      <Section id="home-collections" title={t('home.collections')} action={viewAll('/passport')}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {progress.collections.map((c) => (
            <li key={c.id} className="rounded-2xl bg-card p-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{pick(c, 'name')}</span>
                <span>{formatNumber(c.collected)}/{formatNumber(c.total)}</span>
              </div>
              <div className="mt-2"><ProgressBar value={c.percent} max={100} label={pick(c, 'name')} /></div>
            </li>
          ))}
        </ul>
      </Section>

      {challenges.length > 0 && (
        <Section id="home-challenge" title={t('home.nextChallenge')} action={viewAll('/challenges')}>
          <div className="grid gap-4 md:grid-cols-2">
            {challenges.map((r) => (
              <ChallengeCard key={r.id} result={r} challenge={content.challenges.find((c) => c.id === r.id)} />
            ))}
          </div>
        </Section>
      )}

      <Section id="home-badges" title={t('home.badges')} action={viewAll('/passport')}>
        <BadgeGrid items={badgeItems} />
      </Section>

      <div className="mt-8">
        <DonationSection t={t} number={validBkashNumber(import.meta.env.VITE_BKASH_NUMBER)} />
      </div>
    </div>
  )
}
