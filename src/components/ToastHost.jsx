import { useEffect } from 'react'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'

const AUTO_DISMISS_MS = 5000

/** Celebration feedback for a gained stamp / XP / level / challenge / badge (FR-04, FR-05, FR-06). */
import Icon from './Icon'

export default function ToastHost() {
  const { lastDiff, dismissDiff, content } = useApp()
  const { t, pick, formatNumber } = useLanguage()

  useEffect(() => {
    if (!lastDiff) return undefined
    const id = setTimeout(dismissDiff, AUTO_DISMISS_MS)
    return () => clearTimeout(id)
  }, [lastDiff, dismissDiff])

  const messages = []
  if (lastDiff) {
    if (lastDiff.newStampIds.length) messages.push(t('toast.stamp'))
    if (lastDiff.xpDelta > 0) messages.push(t('toast.xp', { xp: formatNumber(lastDiff.xpDelta) }))
    if (lastDiff.leveledUp) messages.push(t('toast.levelUp', { level: pick(lastDiff.newLevel, 'name') }))
    for (const id of lastDiff.newChallengeIds) {
      messages.push(`${t('toast.challenge')} ${pick(content.challenges.find((c) => c.id === id), 'title')}`)
    }
    for (const id of lastDiff.newBadgeIds) {
      messages.push(`${t('toast.badge')} ${pick(content.badges.find((b) => b.id === id), 'name')}`)
    }
  }

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      {lastDiff && (
        <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl bg-primary-dark px-4 py-3 text-cream shadow-lg">
          <ul className="space-y-1">
            {messages.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <button type="button" onClick={dismissDiff} aria-label={t('common.close')} className="min-h-11 min-w-11 text-lime">
            <Icon name="close" className="mx-auto size-5" />
          </button>
        </div>
      )}
    </div>
  )
}
