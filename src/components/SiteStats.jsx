import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth-context'
import { useLanguage } from '../hooks/useLanguage'
import { fetchStats, joinPresence, recordVisit } from '../lib/siteStats'

const REFRESH_MS = 60_000

/** Community numbers in the footer. Renders nothing when the site has no online setup or the numbers cannot be loaded. */
export default function SiteStats() {
  const { client } = useAuth()
  const { t, formatNumber } = useLanguage()
  const [stats, setStats] = useState(null)
  const [online, setOnline] = useState(0)

  useEffect(() => {
    if (!client) return undefined
    let cancelled = false
    const refresh = async () => {
      try {
        const s = await fetchStats(client)
        if (!cancelled && s) setStats(s)
      } catch {
        // keep whatever we had
      }
    }
    ;(async () => {
      try {
        await recordVisit(client)
      } catch {
        // counting a visit must never get in the way
      }
      refresh()
    })()
    const timer = setInterval(() => document.visibilityState !== 'hidden' && refresh(), REFRESH_MS)
    const leave = joinPresence(client, (n) => !cancelled && setOnline(n))
    return () => {
      cancelled = true
      clearInterval(timer)
      leave()
    }
  }, [client])

  if (!stats) return null
  const items = [
    online > 0 && ['stats.online', online],
    ['stats.visitors', stats.visitors],
    ['stats.users', stats.users],
    ['stats.downloads', stats.downloads],
  ].filter(Boolean)
  return (
    <section aria-label={t('stats.title')} className="border-t border-cream/20 pt-4 md:col-span-2">
      <h2 className="text-sm font-bold text-lime">{t('stats.title')}</h2>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {items.map(([key, n]) => (
          <li key={key}><strong className="text-white">{formatNumber(n)}</strong> {t(key)}</li>
        ))}
      </ul>
    </section>
  )
}
