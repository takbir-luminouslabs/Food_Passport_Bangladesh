import { useState } from 'react'
import { useAuth } from '../context/auth-context'
import { useLanguage } from '../hooks/useLanguage'
import ProfileForm from './ProfileForm'
import ZoomDialog from './ZoomDialog'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Sign in with an email link, or (when signed in) see the account, sign out or delete it. */
export default function AccountDialog({ onClose }) {
  const { user, signInWithEmail, signOut, deleteAccount } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState('idle') // idle | sending | sent | confirmDelete | working
  const [error, setError] = useState(null)

  const send = async (e) => {
    e.preventDefault()
    const value = email.trim()
    if (!EMAIL.test(value)) {
      setError(t('auth.invalidEmail'))
      return
    }
    setError(null)
    setPhase('sending')
    const { error: err } = await signInWithEmail(value)
    if (err) {
      setError(t('auth.failed'))
      setPhase('idle')
    } else {
      setPhase('sent')
    }
  }

  // sign out / delete: keep the dialog open with an error message if it fails, close it when it works
  const run = async (fn) => {
    setError(null)
    setPhase('working')
    const { error: err } = await fn()
    if (err) {
      setError(t('auth.failed'))
      setPhase('idle')
    } else {
      onClose()
    }
  }

  const body = user ? (
    phase === 'confirmDelete' ? (
      <>
        <h2 className="text-xl font-bold text-primary">{t('auth.deleteTitle')}</h2>
        <p className="mt-2">{t('auth.deleteWarn')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={phase === 'working'} onClick={() => run(deleteAccount)} className="min-h-11 rounded-full bg-red-700 px-5 font-semibold text-white">{t('auth.deleteConfirm')}</button>
          <button type="button" onClick={() => setPhase('idle')} className="min-h-11 rounded-full border-2 border-primary px-5 font-semibold text-primary">{t('auth.cancel')}</button>
        </div>
      </>
    ) : (
      <>
        <h2 className="text-xl font-bold text-primary">{t('auth.account')}</h2>
        <p className="mt-2">{t('auth.signedInAs')} <strong className="break-all">{user.email}</strong></p>
        <ProfileForm />
        <div className="mt-4 flex border-t border-primary/15 pt-4 flex-wrap gap-3">
          <button type="button" disabled={phase === 'working'} onClick={() => run(signOut)} className="min-h-11 rounded-full bg-primary px-5 font-semibold text-lime disabled:opacity-60">{t('auth.signOut')}</button>
          <button type="button" onClick={() => setPhase('confirmDelete')} className="min-h-11 rounded-full border-2 border-red-700 px-5 font-semibold text-red-800">{t('auth.delete')}</button>
        </div>
      </>
    )
  ) : phase === 'sent' ? (
    <>
      <h2 className="text-xl font-bold text-primary">{t('auth.checkTitle')}</h2>
      <p role="status" className="mt-2">{t('auth.sent', { email: email.trim() })}</p>
      <button type="button" onClick={onClose} className="mt-4 min-h-11 rounded-full bg-primary px-5 font-semibold text-lime">{t('common.close')}</button>
    </>
  ) : (
    <form onSubmit={send} noValidate>
      <h2 className="text-xl font-bold text-primary">{t('auth.signIn')}</h2>
      <p className="mt-2 text-sm">{t('auth.explain')}</p>
      <label htmlFor="auth-email" className="mt-4 block text-sm font-semibold">{t('auth.emailLabel')}</label>
      <input
        id="auth-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'auth-error' : undefined}
        className="mt-1 min-h-11 w-full rounded-xl border border-primary/30 bg-white px-3"
      />
      <button type="submit" disabled={phase === 'sending'} className="mt-4 min-h-11 rounded-full bg-primary px-6 font-semibold text-lime disabled:opacity-60">
        {t(phase === 'sending' ? 'auth.sending' : 'auth.send')}
      </button>
    </form>
  )

  return (
    <ZoomDialog label={t(user ? 'auth.account' : 'auth.signIn')} closeLabel={t('common.close')} widthClass="max-w-md" onClose={onClose}>
      <div className="rounded-2xl bg-card p-6">
        {body}
        {error && <p id="auth-error" role="alert" className="mt-3 text-sm font-semibold text-red-800">{error}</p>}
        <p className="mt-4 text-xs text-muted">{t('auth.privacy')}</p>
      </div>
    </ZoomDialog>
  )
}
