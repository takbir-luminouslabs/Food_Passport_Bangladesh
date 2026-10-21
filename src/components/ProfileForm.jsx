import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth-context'
import { useLanguage } from '../hooks/useLanguage'
import { NAME_MAX, checkName, cleanName, nameErrorKey } from '../lib/displayName'

/** Display name + "show me on the leaderboard" switch (off by default). Only the server can accept a name. */
export default function ProfileForm() {
  const { client } = useAuth()
  const { t } = useLanguage()
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | saving | saved
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await client.from('profiles').select('display_name, leaderboard_opt_in, name_hidden').maybeSingle()
        if (cancelled || !data) return
        setName(data.display_name ?? '')
        setOptIn(Boolean(data.leaderboard_opt_in))
        setHidden(Boolean(data.name_hidden))
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [client])

  const save = async (e) => {
    e.preventDefault()
    const local = checkName(name)
    if (local) return setError(t(`profile.${local}`))
    if (optIn && cleanName(name) === '') return setError(t('profile.name_required'))
    setError(null)
    setPhase('saving')
    const { data, error: err } = await client.rpc('set_my_profile', { p_name: cleanName(name) || null, p_opt_in: optIn })
    if (err) {
      setError(t(`profile.${nameErrorKey(err) ?? 'failed'}`))
      setPhase('idle')
      return
    }
    setName(data?.display_name ?? '')
    setHidden(Boolean(data?.name_hidden))
    setPhase('saved')
  }

  if (!loaded) return null
  return (
    <form onSubmit={save} noValidate className="mt-4 border-t border-primary/15 pt-4">
      <h3 className="text-base font-bold text-primary">{t('profile.title')}</h3>
      <label htmlFor="profile-name" className="mt-2 block text-sm font-semibold">{t('profile.nameLabel')}</label>
      <input
        id="profile-name"
        type="text"
        maxLength={NAME_MAX}
        autoComplete="nickname"
        value={name}
        onChange={(e) => { setName(e.target.value); setPhase('idle') }}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby="profile-hint"
        className="mt-1 min-h-11 w-full rounded-xl border border-primary/30 bg-white px-3"
      />
      <p id="profile-hint" className="mt-1 text-xs text-muted">{t('profile.hint')}</p>
      <label className="mt-3 flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" checked={optIn} onChange={(e) => { setOptIn(e.target.checked); setPhase('idle') }} className="mt-1 size-5 shrink-0" />
        <span><strong>{t('profile.optIn')}</strong><br />{t('profile.optInHelp')}</span>
      </label>
      {hidden && <p role="status" className="mt-2 text-sm font-semibold text-red-800">{t('profile.hidden')}</p>}
      <button type="submit" disabled={phase === 'saving'} className="mt-3 min-h-11 rounded-full bg-primary px-5 font-semibold text-lime disabled:opacity-60">
        {t(phase === 'saving' ? 'profile.saving' : 'profile.save')}
      </button>
      {phase === 'saved' && <p role="status" className="mt-2 text-sm font-semibold text-primary">{t('profile.saved')}</p>}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-800">{error}</p>}
    </form>
  )
}
