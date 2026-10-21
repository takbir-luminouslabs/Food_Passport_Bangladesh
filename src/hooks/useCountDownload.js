import { useCallback } from 'react'
import { useAuth } from '../context/auth-context'
import { recordDownload } from '../lib/siteStats'

/** Returns a function that adds this browser to the footer's "passports downloaded" count (once per browser). */
export function useCountDownload() {
  const { client } = useAuth()
  return useCallback(() => {
    if (client) recordDownload(client).catch(() => {})
  }, [client])
}
