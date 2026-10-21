import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadCloudClient, redirectUrl } from '../lib/supabase'
import { AuthContext } from './auth-context'

/**
 * Optional accounts. `client` can be passed in (tests do); otherwise it is created from the environment, and stays
 * null when the site has no cloud configuration, in which case `enabled` is false and nothing in the UI shows up.
 */
export function AuthProvider({ client: given, children }) {
  const [client, setClient] = useState(given ?? null)
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let cancelled = false
    let subscription
    ;(async () => {
      const c = given ?? (await loadCloudClient().catch(() => null))
      if (cancelled) return
      setClient(c)
      if (!c) {
        setReady(true)
        return
      }
      const { data } = await c.auth.getSession()
      if (cancelled) return
      setSession(data?.session ?? null)
      setReady(true)
      subscription = c.auth.onAuthStateChange((_event, s) => setSession(s ?? null)).data?.subscription
    })()
    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [given])

  const signInWithEmail = useCallback(
    async (email) => {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true } })
      return { error: error ?? null }
    },
    [client],
  )
  const signOut = useCallback(async () => {
    const { error } = await client.auth.signOut()
    return { error: error ?? null }
  }, [client])
  const deleteAccount = useCallback(async () => {
    const { error } = await client.rpc('delete_my_account')
    if (error) return { error }
    await client.auth.signOut()
    return { error: null }
  }, [client])

  const value = useMemo(
    () => ({ enabled: Boolean(client), ready, user: session?.user ?? null, signInWithEmail, signOut, deleteAccount }),
    [client, ready, session, signInWithEmail, signOut, deleteAccount],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
