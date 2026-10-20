import { useState } from 'react'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'

function downloadFile(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Back up, restore or reset the progress kept in this browser. */
export default function DataSection() {
  const { reset, exportBackup, importBackup } = useApp()
  const { t } = useLanguage()
  const [importMsg, setImportMsg] = useState(null)

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
    <section aria-labelledby="data-h" className="card-soft p-4">
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
  )
}
