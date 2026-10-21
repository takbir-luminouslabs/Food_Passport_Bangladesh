/** Footer counters. The visitor id is a random value kept in this browser only; it is not tied to an account. */
const KEY = 'food-passport-bangladesh:visitor'

export const doNotTrack = () =>
  typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || globalThis.doNotTrack === '1')

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r & 3) | 8).toString(16)
  })

/** The browser's anonymous id, or null when storage is unavailable or the person asked not to be tracked. */
export function visitorId() {
  if (doNotTrack()) return null
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = randomId()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return null
  }
}

export async function recordVisit(client) {
  const id = visitorId()
  if (id) await client.rpc('record_visit', { p_visitor: id })
}

export async function recordDownload(client) {
  const id = visitorId()
  if (id) await client.rpc('record_download', { p_visitor: id })
}

/** { users, visitors, downloads } or null. */
export async function fetchStats(client) {
  const { data, error } = await client.rpc('get_site_stats')
  if (error || !data || typeof data.users !== 'number') return null
  return { users: data.users, visitors: data.visitors, downloads: data.downloads }
}

/**
 * Join the "who is here" channel. Presence is live only: nothing is stored. Returns a function that leaves.
 * Everyone counts, but a visitor who asked not to be tracked only listens.
 */
export function joinPresence(client, onCount) {
  if (typeof client.channel !== 'function') return () => {}
  const id = visitorId() ?? randomId()
  const channel = client.channel('site-online', { config: { presence: { key: id } } })
  channel.on('presence', { event: 'sync' }, () => onCount(Object.keys(channel.presenceState()).length))
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED' && !doNotTrack()) channel.track({})
  })
  return () => {
    client.removeChannel?.(channel)
  }
}
