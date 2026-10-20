import ChallengeCard from '../components/ChallengeCard'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'

export default function Challenges() {
  const { content, progress } = useApp()
  const { t, formatNumber } = useLanguage()
  return (
    <section>
      <h1 className="text-2xl font-bold text-primary">{t('challenges.title')}</h1>
      <p className="mt-1 text-muted">
        {t('challenges.summary', {
          done: formatNumber(progress.completedChallengeIds.length),
          total: formatNumber(progress.challenges.length),
        })}
      </p>
      <p className="mt-1 text-sm text-muted">{t('xp.howTo')}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {progress.challenges.map((result) => (
          <ChallengeCard as="h2" key={result.id} result={result} challenge={content.challenges.find((c) => c.id === result.id)} />
        ))}
      </div>
    </section>
  )
}
