import { useState } from 'react'
import BadgeGrid from '../components/BadgeGrid'
import PassportBook from '../components/PassportBook'
import ShareCard from '../components/ShareCard'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import { useScrollToHash } from '../hooks/useScrollToHash'

function downloadFile(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Passport() {
  const { content, progress, reset, exportBackup, importBackup } = useApp()
  const { t, formatNumber } = useLanguage()
  const [importMsg, setImportMsg] = useState(null)
  useScrollToHash()

  const badgeItems = content.badges.map((badge) => ({ badge, result: progress.badges.find((b) => b.id === badge.id) }))

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = importBackup(await file.text())
    setImportMsg(result.ok ? 'backup.importOk' : 'backup.importFailed')
    e.target.value = ''
  }
  const onReset = () => {
    if (window.confirm(t('passport.resetConfirm'))) reset()
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-primary">{t('passport.title')}</h1>
        <p className="mt-1 text-muted">
          {t('passport.summary', { tried: formatNumber(progress.triedCount), total: formatNumber(content.foods.length) })}
        </p>
      </header>

      <section id="share" aria-labelledby="share-h" className="scroll-mt-4">
        <h2 id="share-h" className="mb-3 text-xl font-bold">{t('share.section')}</h2>
        <ShareCard />
      </section>

      <section aria-labelledby="stamps-h">
        <h2 id="stamps-h" className="mb-3 text-xl font-bold">{t('passport.stamps')}</h2>
        <PassportBook />
      </section>

      <section aria-labelledby="badges-h">
        <h2 id="badges-h" className="mb-3 text-xl font-bold">{t('passport.badges')}</h2>
        <BadgeGrid items={badgeItems} />
      </section>

      <section aria-labelledby="data-h" className="rounded-2xl bg-card p-4">
        <h2 id="data-h" className="text-xl font-bold">{t('passport.data')}</h2>
        <p className="mt-1 text-sm text-muted">{t('backup.hint')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => downloadFile(exportBackup(), 'food-passport-backup.json')} className="min-h-11 rounded-full bg-primary px-4 text-lime">
            {t('backup.export')}
          </button>
          <label className="flex min-h-11 cursor-pointer items-center rounded-full border-2 border-primary px-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold">
            {t('backup.import')}
            <input type="file" accept="application/json,.json" onChange={onImport} className="sr-only" />
          </label>
          <button type="button" onClick={onReset} className="min-h-11 rounded-full border-2 border-red-700 px-4 text-red-700">
            {t('passport.reset')}
          </button>
        </div>
        {importMsg && <p role="status" className="mt-2 text-sm">{t(importMsg)}</p>}
      </section>
    </div>
  )
}
