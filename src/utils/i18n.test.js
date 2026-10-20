import { translations } from '../data/translations'
import { createT, formatNumber, pick, t } from './i18n'

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('translations', () => {
  const en = translations.en
  const bn = translations.bn

  test('Bengali and English have exactly the same keys', () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort())
  })

  test('no empty strings', () => {
    for (const lang of [en, bn]) for (const [k, v] of Object.entries(lang)) expect(v.trim(), k).not.toBe('')
  })

  test('Bengali strings contain Bengali script (except brand-only strings)', () => {
    const latinOnlyAllowed = new Set(['brand.name'])
    for (const [k, v] of Object.entries(bn)) {
      if (!latinOnlyAllowed.has(k)) expect(/[ঀ-৿]/.test(v), k).toBe(true)
    }
  })

  test('placeholders match across languages', () => {
    for (const k of Object.keys(en)) expect(placeholders(bn[k]), k).toEqual(placeholders(en[k]))
  })

  test('donation copy never asks for a PIN or OTP and says it is optional', () => {
    expect(en['donation.optional']).toMatch(/optional/i)
    expect(bn['donation.optional']).toMatch(/ঐচ্ছিক/)
    expect(en['donation.safety']).toMatch(/PIN/)
  })
})

describe('t()', () => {
  test('returns the requested language', () => {
    expect(t('en', 'nav.passport')).toBe(translations.en['nav.passport'])
    expect(t('bn', 'nav.passport')).toBe(translations.bn['nav.passport'])
  })

  test('interpolates variables and leaves unknown ones visible', () => {
    const tt = createT({ en: { a: 'Hi {name}, {x}' }, bn: {} })
    expect(tt('en', 'a', { name: 'Rafi' })).toBe('Hi Rafi, {x}')
  })

  test('falls back to English, then to the key itself', () => {
    const tt = createT({ en: { only: 'English only' }, bn: {} })
    expect(tt('bn', 'only')).toBe('English only')
    expect(tt('bn', 'nope')).toBe('nope')
  })
})

describe('pick()', () => {
  const food = { name_bn: 'চটপটি', name_en: 'Chotpoti' }
  test('picks the localized field with fallback', () => {
    expect(pick(food, 'name', 'bn')).toBe('চটপটি')
    expect(pick(food, 'name', 'en')).toBe('Chotpoti')
    expect(pick({ name_en: 'X' }, 'name', 'bn')).toBe('X')
    expect(pick(undefined, 'name', 'en')).toBe('')
  })
})

test('formatNumber uses Bengali digits in Bengali', () => {
  expect(formatNumber(123, 'bn')).toBe('১২৩')
  expect(formatNumber(1500, 'en')).toBe('1,500')
})

test('formatNumber accepts Intl options, e.g. zero-padded page numbers', () => {
  expect(formatNumber(3, 'bn', { minimumIntegerDigits: 2 })).toBe('০৩')
  expect(formatNumber(3, 'en', { minimumIntegerDigits: 2 })).toBe('03')
})
