/**
 * The optional cloud client. It exists only when the site is built with VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY; without them the whole app is the guest-only passport and no cloud code is even
 * downloaded (the library is imported on demand).
 *
 * Sign-in uses the PKCE flow, so the email link comes back as `?code=...` before the `#/` route. That keeps it clear
 * of HashRouter, which owns everything after the `#`.
 */
export const cloudConfigured = (env = import.meta.env) => Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY)

export async function loadCloudClient(env = import.meta.env) {
  if (!cloudConfigured(env)) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
}

/** Where the email link should bring the person back to: the site root, whatever sub-path it is hosted under. */
export const redirectUrl = (loc = globalThis.location, base = import.meta.env.BASE_URL) => `${loc.origin}${base}`
