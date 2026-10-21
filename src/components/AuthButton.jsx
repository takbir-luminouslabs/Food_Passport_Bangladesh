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
        className="min-h-11 rounded-full px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline max-[359px]:hidden"
      >
        {t(user ? 'auth.account' : 'auth.signIn')}
      </button>
      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </>
  )
}
