import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const load = (name) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8'))
const categories = load('categories')
const foods = load('foods')
const challenges = load('challenges')
const badges = load('badges')
const quiz = load('quiz')

const categoryIds = new Set(categories.map((c) => c.id))
const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh']
const STATUSES = ['unverified', 'verified']
const hasBengali = (s) => /[ঀ-৿]/.test(s)

describe('categories', () => {
  test('ids are unique and bilingual', () => {
    expect(categoryIds.size).toBe(categories.length)
    for (const c of categories) {
      expect(hasBengali(c.name_bn)).toBe(true)
      expect(c.name_en).toBeTruthy()
    }
  })
})

describe('foods', () => {
  test('has a manageable but sufficient catalogue', () => {
    expect(foods.length).toBeGreaterThanOrEqual(35)
  })

  test('ids are unique, stable slugs', () => {
    const ids = foods.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  test('English names are unique (no translation duplicates)', () => {
    const names = foods.map((f) => f.name_en.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  test.each(foods.map((f) => [f.id, f]))('%s has complete, valid fields', (_id, f) => {
    expect(hasBengali(f.name_bn)).toBe(true)
    expect(hasBengali(f.description_bn)).toBe(true)
    expect(f.name_en).toBeTruthy()
    expect(f.description_en).toBeTruthy()
    expect(categoryIds.has(f.category)).toBe(true)
    expect(STATUSES).toContain(f.verification_status)
    expect(['regional', 'national']).toContain(f.scope)
    expect(f.xp).toBe(10)
    expect(f).toHaveProperty('image_url')
    expect(f).toHaveProperty('image_attribution')
    expect(f).toHaveProperty('source_url')
    if (f.scope === 'regional') {
      expect(f.region.district_en).toBeTruthy()
      expect(hasBengali(f.region.district_bn)).toBe(true)
      expect(DIVISIONS).toContain(f.region.division)
    } else {
      expect(f.region).toBeNull()
    }
  })

  test('nothing is marked verified without a source URL', () => {
    for (const f of foods.filter((x) => x.verification_status === 'verified')) {
      expect(f.source_url).toMatch(/^https?:\/\//)
    }
  })

  test('catalogue is district-focused and spread across divisions', () => {
    const regional = foods.filter((f) => f.scope === 'regional')
    expect(regional.length).toBeGreaterThanOrEqual(25)
    const divisions = new Set(regional.map((f) => f.region.division))
    expect(divisions.size).toBe(DIVISIONS.length)
  })
})

describe('challenges are achievable with the catalogue (PRD FR-07)', () => {
  const byCategory = (cat) => foods.filter((f) => f.category === cat).length
  const regionalCount = foods.filter((f) => f.scope === 'regional').length
  const usedCategories = new Set(foods.map((f) => f.category)).size

  test('ids unique and bilingual', () => {
    expect(new Set(challenges.map((c) => c.id)).size).toBe(challenges.length)
    for (const c of challenges) {
      expect(hasBengali(c.title_bn) && hasBengali(c.description_bn)).toBe(true)
      expect(c.title_en && c.description_en).toBeTruthy()
      expect(c.xp_reward).toBe(25)
      expect(c.is_active).toBe(true)
    }
  })

  test.each(challenges.map((c) => [c.id, c]))('%s is not impossible', (_id, c) => {
    const r = c.rules
    switch (r.type) {
      case 'count_category':
        expect(categoryIds.has(r.category)).toBe(true)
        expect(byCategory(r.category)).toBeGreaterThanOrEqual(r.target)
        break
      case 'count_total':
      case 'stamps_total':
        expect(foods.length).toBeGreaterThanOrEqual(r.target)
        break
      case 'distinct_categories':
        expect(usedCategories).toBeGreaterThanOrEqual(r.target)
        break
      case 'count_regional':
        expect(regionalCount).toBeGreaterThanOrEqual(r.target)
        break
      case 'complete_collection':
        break
      case 'xp_total':
        expect(foods.length * 10).toBeGreaterThanOrEqual(r.target)
        break
      default:
        throw new Error(`unknown rule type ${r.type}`)
    }
  })
})

describe('badges (PRD FR-06)', () => {
  test('ids unique and bilingual', () => {
    expect(new Set(badges.map((b) => b.id)).size).toBe(badges.length)
    for (const b of badges) {
      expect(hasBengali(b.name_bn) && hasBengali(b.description_bn)).toBe(true)
      expect(b.name_en && b.description_en).toBeTruthy()
    }
  })

  test('food-based thresholds fit the catalogue size', () => {
    for (const b of badges) {
      const r = b.unlock_rule
      if (r.type === 'count_total') expect(foods.length).toBeGreaterThanOrEqual(r.target)
      if (r.type === 'count_category') {
        expect(categoryIds.has(r.category)).toBe(true)
        expect(foods.filter((f) => f.category === r.category).length).toBeGreaterThanOrEqual(r.target)
      }
    }
  })
})

const ALL_64_DISTRICTS = [
  'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj',
  'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail',
  'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Cumilla', "Cox's Bazar", 'Feni', 'Khagrachhari',
  'Lakshmipur', 'Noakhali', 'Rangamati',
  'Bogura', 'Joypurhat', 'Naogaon', 'Natore', 'Chapainawabganj', 'Pabna', 'Rajshahi', 'Sirajganj',
  'Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira',
  'Barguna', 'Barishal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur',
  'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet',
  'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon',
  'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur',
]

describe('district coverage (all 64 districts)', () => {
  const regional = foods.filter((f) => f.scope === 'regional')

  test('reference list really has 64 distinct districts', () => {
    expect(new Set(ALL_64_DISTRICTS).size).toBe(64)
  })

  test('every district has at least one food', () => {
    const covered = new Set(regional.map((f) => f.region.district_en))
    expect(ALL_64_DISTRICTS.filter((d) => !covered.has(d))).toEqual([])
  })

  test('exactly one (the most popular) food per district: 64 foods in all', () => {
    expect(foods).toHaveLength(64)
    const perDistrict = new Map()
    for (const f of regional) perDistrict.set(f.region.district_en, (perDistrict.get(f.region.district_en) ?? 0) + 1)
    expect([...perDistrict].filter(([, n]) => n !== 1)).toEqual([])
  })

  test('no food uses an unknown district name', () => {
    const known = new Set(ALL_64_DISTRICTS)
    expect(regional.filter((f) => !known.has(f.region.district_en)).map((f) => f.id)).toEqual([])
  })
})

describe('association confidence (PRD 4.6: do not present unverified claims as fact)', () => {
  test('regional foods carry a confidence level, national foods do not', () => {
    for (const f of foods) {
      if (f.scope === 'regional') expect(['high', 'medium', 'low']).toContain(f.association_confidence)
      else expect(f.association_confidence).toBeNull()
    }
  })

  test('"high" confidence requires a source URL', () => {
    for (const f of foods.filter((x) => x.association_confidence === 'high')) {
      expect(f.source_url, f.id).toMatch(/^https?:\/\//)
    }
  })
})

describe('quiz questions', () => {
  test('ids are unique and there are enough questions', () => {
    expect(new Set(quiz.map((q) => q.id)).size).toBe(quiz.length)
    expect(quiz.length).toBeGreaterThanOrEqual(20)
  })

  test.each(quiz.map((q) => [q.id, q]))('%s is complete, bilingual and sourced', (_id, q) => {
    expect(hasBengali(q.question_bn) && hasBengali(q.explanation_bn)).toBe(true)
    expect(q.question_en && q.explanation_en).toBeTruthy()
    expect(q.options).toHaveLength(4)
    for (const o of q.options) expect(hasBengali(o.bn) && o.en).toBeTruthy()
    expect(new Set(q.options.map((o) => o.en)).size).toBe(4)
    expect(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4).toBe(true)
    expect(q.source_url).toMatch(/^https:\/\//)
  })
})
