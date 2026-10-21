import { useState } from 'react'
import { useAuth } from '../context/auth-context'
import { useLanguage } from '../hooks/useLanguage'
import AccountDialog from './AccountDialog'

/** Header button: "Sign in" for guests, "Account" once signed in. Absent entirely when the site has no cloud setup. */
export default function AuthButton() {
  const { enabled, ready, user } = useAuth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  if (!enabled || !ready) return null
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm max-[479px]:min-w-11 max-[479px]:justify-center max-[479px]:px-0 font-semibold shadow-sm transition-colors max-[359px]:hidden ${
          user ? 'border border-primary bg-card text-primary hover:bg-lime/40' : 'bg-primary text-lime hover:bg-primary-dark'
        }`}
      >
        {user ? (
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold uppercase text-lime">
            {(user.email ?? '?')[0]}
          </span>
        ) : (
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </svg>
        )}
        <span className="max-[479px]:sr-only">{t(user ? 'auth.account' : 'auth.signIn')}</span>
      </button>
      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </>
  )
}
