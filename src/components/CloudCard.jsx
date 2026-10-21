import { useState } from 'react'
import { useAuth } from '../context/auth-context'
import { useLanguage } from '../hooks/useLanguage'
import AccountDialog from './AccountDialog'

/** Optional "keep my passport online" prompt under the download step. Shown only when the site has cloud setup. */
export default function CloudCard() {
  const { enabled, ready, user } = useAuth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  if (!enabled || !ready) return null
  return (
    <section aria-labelledby="cloud-title" className="card-soft mt-6 p-5">
      <h3 id="cloud-title" className="text-lg font-bold text-primary">{t('cloud.title')}</h3>
      <p className="mt-1">{t('cloud.body')}</p>
      {user && <p className="mt-2 text-sm">{t('auth.signedInAs')} <strong className="break-all">{user.email}</strong></p>}
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="mt-3 min-h-11 rounded-full bg-primary px-6 font-semibold text-lime">
        {t(user ? 'cloud.manage' : 'cloud.cta')}
      </button>
      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </section>
  )
}
