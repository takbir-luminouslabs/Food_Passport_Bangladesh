/**
 * Quick checks for the display-name field so people get an instant message. The database repeats these and adds the
 * blocklist, link and phone-number rules (set_my_profile), so the server is always the one that decides.
 */
export const NAME_MIN = 2
export const NAME_MAX = 24
const ALLOWED = /^(?:[A-Za-z0-9 ._À-ɏঀ-৿-]|‌|‍)+$/

export const cleanName = (s) => s.replace(/\s+/g, ' ').trim()

/** Returns an error key (name_length | name_chars) or null. An empty name is allowed (no public name). */
export function checkName(raw) {
  const v = cleanName(raw)
  if (v === '') return null
  if ([...v].length < NAME_MIN || [...v].length > NAME_MAX) return 'name_length'
  if (!ALLOWED.test(v)) return 'name_chars'
  return null
}

/** Map a server error to one of our message keys. */
export function nameErrorKey(error) {
  const m = String(error?.message ?? '')
  for (const k of ['name_length', 'name_chars', 'name_link', 'name_blocked', 'name_required']) if (m.includes(k)) return k
  return null
}
