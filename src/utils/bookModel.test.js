import { readFileSync } from 'node:fs'
import { computeProgress } from './scoring'
import { buildBookModel } from './bookModel'
import { buildBookPages } from './bookPages'
import { createInitialState, markTried } from './state'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const categories = JSON.parse(readFileSync('public/data/categories.json', 'utf8'))
const challenges = JSON.parse(readFileSync('public/data/challenges.json', 'utf8'))
const badges = JSON.parse(readFileSync('public/data/badges.json', 'utf8'))
const content = { foods, categories, challenges, badges }
const NOW = new Date(2026, 9, 20, 12)
const build = (ids = [], opts = {}) => {
  const state = ids.reduce(markTried, createInitialState('en'))
  return buildBookModel({ progress: computeProgress(state, content), content, lang: 'en', now: NOW, ...opts })
}

test('a cover sheet comes first, then one sheet per spread (two pages each)', () => {
  const m = build()
  const pages = buildBookPages(computeProgress(createInitialState('en'), content).collections)
  expect(m.sheets[0].type).toBe('cover')
  expect(m.sheets).toHaveLength(1 + Math.ceil(pages.length / 2))
  expect(m.sheets[1].left.type).toBe('data')
  expect(m.sheets[1].right.type).toBe('visa')
})

const pagesOf = (m) => m.sheets.slice(1).flatMap((s) => [s.left, s.right]).filter(Boolean)

test('the cover carries the brand and the holder name when given', () => {
  expect(build().sheets[0].brand).toBe('Food Passport Bangladesh')
  expect(build([], { displayName: 'Rafi' }).sheets[0].holder).toBe('Rafi')
  expect(build().sheets[0].holder).toBeNull()
})

test('every one of the 64 foods has a slot across the visa pages, collected or locked, never more than six per page', () => {
  const m = build(['dinajpur-katarivog', 'natore-kacha-gola'])
  const visa = pagesOf(m).filter((p) => p.type === 'visa')
  for (const p of visa) expect(p.slots.length).toBeLessThanOrEqual(6)
  const slots = visa.flatMap((p) => p.slots)
  expect(slots).toHaveLength(64)
  expect(slots.filter((s) => s.state === 'collected')).toHaveLength(2)
})

test('collected slots carry a full stamp (entry number, district); locked ones carry just the name and district', () => {
  const m = build(['dinajpur-katarivog'])
  const slots = pagesOf(m).filter((p) => p.type === 'visa').flatMap((p) => p.slots)
  const got = slots.find((s) => s.state === 'collected')
  expect(got.stamp).toMatchObject({ name: 'Katarivog Rice', entryNo: '001', district: 'Dinajpur' })
  const locked = slots.find((s) => s.state === 'locked')
  expect(locked).toMatchObject({ state: 'locked' })
  expect(locked.name).toBeTruthy()
  expect(locked.stamp).toBeUndefined()
})

test('visa pages are labelled: page number, collection name, part n/total and collection progress', () => {
  const m = build(['dinajpur-katarivog'])
  const visa = pagesOf(m).filter((p) => p.type === 'visa')
  expect(visa[0]).toMatchObject({ pageLabel: 'PAGE 01', title: 'Rice and Biryani', statLine: '1/3 · 33%' })
  const sweets = visa.filter((p) => p.title.startsWith('Sweets and Desserts'))
  expect(sweets.map((p) => p.title)).toEqual(sweets.map((_, i) => `Sweets and Desserts · ${i + 1}/${sweets.length}`))
  expect(sweets.length).toBeGreaterThan(1)
})

test('labels follow the language, with Bengali numerals', () => {
  const m = build(['dinajpur-katarivog'], { lang: 'bn' })
  const first = m.sheets[1].right
  expect(first.pageLabel).toBe('পাতা ০১')
  expect(first.title).toBe('ভাত ও বিরিয়ানি')
  expect(first.statLine).toBe('১/৩ · ৩৩%')
  expect(m.card.visaLabel).toBe('ভিসা')
})

test('pages carry decorative MRZ text that is only A-Z, 0-9 and <', () => {
  const visa = pagesOf(build()).filter((p) => p.type === 'visa')
  for (const p of visa) expect(p.mrz).toMatch(/^[A-Z0-9<]{44}$/)
})

test('contains no private data: no storage state, ids or quiz progress', () => {
  const json = JSON.stringify(build(['dinajpur-katarivog']))
  for (const secret of ['quizProgress', 'correctIds', 'triedFoodIds', 'dinajpur-katarivog"']) expect(json).not.toContain(secret)
})

test('a sample text covers every string drawn, so the Bengali font can be loaded up front', () => {
  const m = build(['dinajpur-katarivog'], { lang: 'bn' })
  expect(m.sampleText).toContain('ভাত ও বিরিয়ানি')
  expect(m.sampleText).toContain('দিনাজপুর')
  expect(m.sampleText).toContain(m.card.brand)
})
