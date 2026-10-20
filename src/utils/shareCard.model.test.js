import { fixture } from '../test/fixtures'
import { computeProgress } from './scoring'
import { buildCardModel } from './shareCard'
import { createInitialState, markTried } from './state'

const content = {
  ...fixture,
  foods: fixture.foods.map((f) => ({ ...f, name_en: `Food ${f.id}`, name_bn: `খাবার ${f.id}`, image_url: null })),
  badges: fixture.badges.map((b) => ({ ...b, name_en: `Badge ${b.id}`, name_bn: `ব্যাজ ${b.id}` })),
}
const NOW = new Date(2026, 9, 20, 12, 0, 0) // 20 Oct 2026, local time
const build = (ids, opts = {}) => {
  const state = ids.reduce(markTried, createInitialState('en'))
  return buildCardModel({ progress: computeProgress(state, content), content, lang: 'en', now: NOW, ...opts })
}
const field = (m, label) => m.fields.find((f) => f.label === label)?.value

test('titles the card with the display name when provided, in both languages', () => {
  expect(build([], { displayName: 'Rafi' }).title).toBe('Rafi’s Food Passport')
  expect(build([], { displayName: 'রাফি', lang: 'bn' }).title).toBe('রাফি-এর ফুড পাসপোর্ট')
  expect(build([]).title).toBe('My Food Passport')
})

test('cleans the display name: trims, collapses spaces, strips control chars, caps length', () => {
  expect(build([], { displayName: '  Ra\n  fi\u0007 ' }).displayName).toBe('Ra fi')
  expect(build([], { displayName: 'x'.repeat(80) }).displayName).toHaveLength(30)
  expect(build([], { displayName: '   ' }).displayName).toBeNull()
})

describe('passport data-page fields', () => {
  test('name falls back to a friendly default when none is given', () => {
    expect(field(build([]), 'Name')).toBe('Food Explorer')
    expect(field(build([], { displayName: 'Rafi' }), 'Name')).toBe('Rafi')
  })

  test('percentage of foods tried, stamps and issue date reflect current progress (no XP, no level)', () => {
    const m = build(['s1', 's2'])
    expect(field(m, 'Bangladesh foods tried')).toBe('33%')
    expect(field(m, 'Stamps')).toBe('2/6')
    expect(field(m, 'Issued')).toBe('20 Oct 2026')
    expect(m.fields.map((f) => f.label)).not.toContain('Total XP')
    expect(m.fields.map((f) => f.label)).not.toContain('Level')
    expect(m.percent.ratio).toBeCloseTo(0.33)
    expect(m.percent.text).toBe('2 of 6 district foods')
  })

  test('uses Bengali labels and digits', () => {
    const m = build(['s1', 's2'], { lang: 'bn' })
    expect(m.fields.map((f) => f.label)).toEqual(['নাম', 'বাংলাদেশের খাবার চেখে দেখা', 'স্ট্যাম্প', 'ইস্যু'])
    expect(field(m, 'বাংলাদেশের খাবার চেখে দেখা')).toBe('৩৩%')
    expect(field(m, 'ইস্যু')).toMatch(/২০২৬/)
  })
})

test('shows every collected stamp, newest first, with a stable tilt each', () => {
  const ids = ['s1', 's2', 'm1', 'm2', 'm3', 'd1']
  const m = build(ids)
  expect(m.stamps.map((s) => s.name)).toEqual(['Food d1', 'Food m3', 'Food m2', 'Food m1', 'Food s2', 'Food s1'])
  expect(m.stamps.every((s) => Math.abs(s.tilt) <= 6)).toBe(true)
  expect(build(ids, { lang: 'bn' }).stamps[0].name).toBe('খাবার d1')
  const many = {
    ...content,
    foods: Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, category: 'street_food', xp: 10, scope: 'national', name_en: `F${i}`, name_bn: `ফ${i}`, image_url: null })),
  }
  const state = Array.from({ length: 12 }, (_, i) => `f${i}`).reduce(markTried, createInitialState('en'))
  const big = buildCardModel({ progress: computeProgress(state, many), content: many, lang: 'en', now: NOW })
  expect(big.stamps).toHaveLength(12)
  expect(big.stamps[0].name).toBe('F11')
  expect(big.stamps.at(-1).name).toBe('F0')
})

test('each stamp carries its category (for the vector icon) and an optional image URL for the fallback logic', () => {
  const m = build(['s1'])
  expect(m.stamps[0].category).toBe('street_food')
  expect(m.stamps[0].icon).toBeUndefined()
  expect(m.stamps[0].imageUrl).toBeNull()
})

test('lists earned badges only', () => {
  expect(build(['s1']).badges).toEqual(['Badge b-first'])
  expect(build([]).badges).toEqual([])
})

test('includes branding, page label, collected label and a self-reported note', () => {
  const m = build([])
  expect(m.brand).toBe('Food Passport Bangladesh')
  expect(m.selfReported).toBe('Self-reported progress')
  expect(m.emptyText).toBe('Collect your first stamp!')
  expect(m.pageLabel).toBe('PAGE 01')
  expect(m.collectedLabel).toBe('Collected')
})

describe('decorative machine-readable lines', () => {
  test('are two lines of exactly 44 characters from A-Z, 0-9 and <', () => {
    const m = build(['s1'], { displayName: 'Rafi Ahmed' })
    expect(m.mrz).toHaveLength(2)
    for (const line of m.mrz) expect(line).toMatch(/^[A-Z0-9<]{44}$/)
    expect(m.mrz[0].startsWith('FOOD<PASSPORT<RAFI<AHMED')).toBe(true)
  })

  test('a Bengali name never produces garbage in the Latin-only lines', () => {
    const m = build([], { displayName: 'রাফি', lang: 'bn' })
    for (const line of m.mrz) expect(line).toMatch(/^[A-Z0-9<]{44}$/)
    expect(m.mrz[0]).toContain('EXPLORER')
  })
})

test('uses the site URL only when one is provided', () => {
  expect(build([]).siteUrl).toBeNull()
  expect(build([], { siteUrl: 'https://example.com/fp' }).siteUrl).toBe('https://example.com/fp')
})

test('contains no private data: ids, email or auth fields never reach the card', () => {
  const state = { ...markTried(createInitialState('en'), 's1'), email: 'secret@example.com', userId: 'u-123', accessToken: 'tok-abc' }
  const m = buildCardModel({ progress: computeProgress(state, content), content, lang: 'en', now: NOW, state })
  const dump = JSON.stringify(m)
  for (const secret of ['secret@example.com', 'u-123', 'tok-abc', 'email', 'userId', 'accessToken']) {
    expect(dump).not.toContain(secret)
  }
  expect(JSON.stringify(m.stamps)).not.toContain('"id"')
})

describe('real-passport details on the card model', () => {
  test('every stamp has its own shape, ink colour and a district line (regional foods only)', () => {
    const m = build(['s1', 'm1'])
    for (const s of m.stamps) {
      expect(['round', 'oval', 'rect', 'octagon']).toContain(s.shape)
      expect(s.ink).toMatch(/^#[0-9A-F]{6}$/i)
    }
    const regional = content.foods.find((f) => f.region)
    const m2 = build([regional.id])
    expect(m2.stamps[0].district).toBe('X')
    expect(build([regional.id], { lang: 'bn' }).stamps[0].district).toBe('এক্স')
    expect(build(['s1']).stamps[0].district).toBeNull()
  })

  test('data page lists nationality, validity and a signature line, in both languages', () => {
    const en = build([])
    expect(en.details.map((d) => d.label)).toEqual(['Nationality', 'Valid for'])
    expect(en.details.map((d) => d.value)).toEqual(['Bangladeshi Foodie', 'Lifetime'])
    expect(en.signatureLabel).toBe('Holder’s signature')
    expect(build([], { lang: 'bn' }).details[0].label).toBe('জাতীয়তা')
  })

  test('visa page and empty slots are labelled', () => {
    const m = build([])
    expect(m.visaLabel).toBe('VISA')
    expect(m.stampHereLabel).toBe('Stamp here')
    expect(build([], { lang: 'bn' }).visaLabel).toBe('ভিসা')
  })
})

test('each stamp gets an entry number in the order it was collected, zero-padded', () => {
  const m = build(['s1', 's2', 'm1'])
  expect(m.stamps.map((s) => s.entryNo)).toEqual(['003', '002', '001']) // newest first
  expect(build(['s1'], { lang: 'bn' }).stamps[0].entryNo).toBe('০০১')
  expect(m.entryLabel).toBe('No.')
  expect(build([], { lang: 'bn' }).entryLabel).toBe('নং')
})
