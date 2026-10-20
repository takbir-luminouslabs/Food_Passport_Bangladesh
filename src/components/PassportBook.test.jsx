import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { buildBookPages } from '../utils/bookPages'
import { buildCollections } from '../utils/collections'

const bn = translations.bn
const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const categories = JSON.parse(readFileSync('public/data/categories.json', 'utf8'))
const pages = buildBookPages(buildCollections(foods, categories))
const SPREADS = Math.ceil(pages.length / 2)
const bnNum = (n) => new Intl.NumberFormat('bn-BD').format(n)
const STREET = 'স্ট্রিট ফুড'
const RICE = 'ভাত ও বিরিয়ানি'
const FISH = 'মাছ ও সামুদ্রিক খাবার'
const REGIONAL = 'আঞ্চলিক বিশেষত্ব'
const book = () => screen.getByRole('group', { name: bn['book.label'] })
const next = () => screen.getByRole('button', { name: bn['book.next'] })
const prev = () => screen.getByRole('button', { name: bn['book.prev'] })
// a collection that continues over several pages is named "<collection> · 2/5"
const hasRegion = (name) => screen.queryAllByRole('region', { name: new RegExp(`^${name}`) }).length > 0

test('opens on a spread with the holder data page and the first visa page', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti', 'haleem'] } })
  const holder = within(book()).getByRole('region', { name: bn['book.dataPage'] })
  expect(within(holder).getByText(bn['stats.totalXp'])).toBeInTheDocument()
  expect(within(holder).getByText(bn['stats.level'])).toBeInTheDocument()
  expect(within(holder).getByText('২/৭১')).toBeInTheDocument()
  expect(holder.querySelector('[data-mrz]')).toHaveAttribute('aria-hidden', 'true')
  expect(hasRegion(STREET)).toBe(true)
  expect(hasRegion(RICE)).toBe(false)
})

test('next and previous turn to the neighbouring pages', async () => {
  const { user } = await renderApp('#/passport')
  expect(screen.getByText(`পাতা ১ / ${bnNum(SPREADS)}`)).toBeInTheDocument()
  await user.click(next())
  expect(hasRegion(RICE)).toBe(true)
  expect(hasRegion(FISH)).toBe(true)
  expect(hasRegion(STREET)).toBe(false)
  expect(screen.getByText('পাতা ২ / ' + bnNum(SPREADS))).toBeInTheDocument()
  await user.click(prev())
  expect(hasRegion(STREET)).toBe(true)
})

test('cannot turn past the first or last page', async () => {
  const { user } = await renderApp('#/passport')
  expect(prev()).toBeDisabled()
  for (let i = 0; i < SPREADS - 1; i++) await user.click(next())
  expect(next()).toBeDisabled()
  expect(screen.getByText(`পাতা ${bnNum(SPREADS)} / ${bnNum(SPREADS)}`)).toBeInTheDocument()
  expect(hasRegion(REGIONAL)).toBe(true)
  expect(screen.queryByRole('region', { name: bn['book.dataPage'] })).toBeNull()
})

test('collection chips jump straight to that page', async () => {
  const { user } = await renderApp('#/passport')
  const jump = screen.getByRole('navigation', { name: bn['book.jump'] })
  await user.click(within(jump).getByRole('button', { name: REGIONAL }))
  expect(hasRegion(REGIONAL)).toBe(true)
  expect(within(jump).getByRole('button', { name: REGIONAL })).toHaveAttribute('aria-current', 'true')
  expect(within(jump).getByRole('button', { name: STREET })).not.toHaveAttribute('aria-current')
})

test('arrow keys turn pages while focus is inside the book', async () => {
  const { user } = await renderApp('#/passport')
  next().focus()
  await user.keyboard('{ArrowRight}')
  expect(hasRegion(RICE)).toBe(true)
  await user.keyboard('{ArrowLeft}')
  expect(hasRegion(STREET)).toBe(true)
})

test('every food appears on exactly one page, and no page holds more than six stamps', async () => {
  const { user } = await renderApp('#/passport')
  const seen = []
  for (let i = 0; i < SPREADS; i++) {
    const links = within(book()).getAllByRole('link').map((l) => l.getAttribute('href'))
    seen.push(...links)
    for (const region of within(book()).queryAllByRole('region')) {
      expect(within(region).queryAllByRole('link').length).toBeLessThanOrEqual(6)
    }
    if (i < SPREADS - 1) await user.click(next())
  }
  expect(seen.sort()).toEqual(foods.map((f) => `#/discover/${f.id}`).sort())
})

test('a collection with many foods continues over pages labelled "n/total" and its chip opens the first part', async () => {
  const { user } = await renderApp('#/passport')
  const sweets = pages.filter((p) => p.type === 'visa' && p.collectionId === 'sweets_desserts')
  expect(sweets.length).toBeGreaterThan(1)
  const jump = screen.getByRole('navigation', { name: bn['book.jump'] })
  await user.click(within(jump).getByRole('button', { name: 'মিষ্টি ও ডেজার্ট' }))
  expect(screen.getByRole('region', { name: `মিষ্টি ও ডেজার্ট · ১/${bnNum(sweets.length)}` })).toBeInTheDocument()
})

describe('holder name on the data page', () => {
  const holder = () => within(book()).getByRole('region', { name: bn['book.dataPage'] })

  test('shows the default holder name until one is typed on the share card, then follows it', async () => {
    const { user } = await renderApp('#/passport')
    expect(within(holder()).getByText(bn['share.field.name'])).toBeInTheDocument()
    expect(within(holder()).getByText(bn['share.holderDefault'])).toBeInTheDocument()
    await user.type(screen.getByLabelText(bn['share.nameLabel']), 'রাফি আহমেদ')
    expect(within(holder()).getByText('রাফি আহমেদ')).toBeInTheDocument()
    expect(within(holder()).queryByText(bn['share.holderDefault'])).toBeNull()
    await user.clear(screen.getByLabelText(bn['share.nameLabel']))
    expect(within(holder()).getByText(bn['share.holderDefault'])).toBeInTheDocument()
  })

  test('the name stays in memory only', async () => {
    const { user } = await renderApp('#/passport')
    await user.type(screen.getByLabelText(bn['share.nameLabel']), 'রাফি')
    expect(JSON.stringify({ ...localStorage })).not.toContain('রাফি')
  })

  test('a blank or whitespace-only name falls back to the default', async () => {
    const { user } = await renderApp('#/passport')
    await user.type(screen.getByLabelText(bn['share.nameLabel']), '   ')
    expect(within(holder()).getByText(bn['share.holderDefault'])).toBeInTheDocument()
  })
})

test('the machine-readable lines are pinned to the bottom of every page, whatever it holds', async () => {
  const { user } = await renderApp('#/passport')
  for (let i = 0; i < 3; i++) {
    for (const page of within(book()).getAllByRole('region')) {
      const mrz = [...page.querySelectorAll('[data-mrz]')]
      expect(mrz.length).toBeGreaterThan(0)
      // the last element of the page is (or sits in) a block pushed down with auto margin
      const anchor = mrz[0].parentElement === page ? mrz[0] : mrz[0].parentElement
      expect(anchor).toHaveClass('mt-auto')
      expect(page.lastElementChild).toBe(anchor)
    }
    await user.click(next())
  }
})
