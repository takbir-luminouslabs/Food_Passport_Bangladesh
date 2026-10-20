/**
 * The bKash number is only shown once it has been configured, so only after it is verified. Anything that does not
 * look like a Bangladeshi mobile number (a typo, a placeholder) counts as "not verified yet" and shows nothing.
 */
export function validBkashNumber(raw) {
  if (typeof raw !== 'string') return ''
  const digits = raw.replace(/[\s-]/g, '').replace(/^\+?880/, '0')
  return /^01[3-9]\d{8}$/.test(digits) ? digits : ''
}
