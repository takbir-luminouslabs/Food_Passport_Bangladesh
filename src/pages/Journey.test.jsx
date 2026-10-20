import { readFileSync } from 'node:fs'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'

const bn = translations.bn
const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
let scrolled
beforeEach(() => {
  scrolled = []
  Element.prototype.scrollIntoView = vi.fn(function scroll() { scrolled.push(this.id) })
})
afterEach(() => {
  delete Element.prototype.scrollIntoView
  vi.unstubAllGlobals()
})

const step = (key) => document.getElementById(key)

describe('one page, one flow: pick foods, your passport, download', () => {
  test('the home page holds all three steps in order, under a single h1', async () => {
    await renderApp('#/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const order = ['pick', 'passport', 'download'].map(step)
    for (const el of order) expect(el).not.toBeNull()
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: bn['journey.pick'] })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: bn['journey.passport'] })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: bn['journey.download'] })).toBeInTheDocument()
  })

  test('step 1 lists all 64 foods with search and filters', async () => {
    await renderApp('#/')
    const pick = within(step('pick'))
    expect(pick.getByRole('searchbox')).toBeInTheDocument()
    expect(pick.getAllByRole('button', { name: new RegExp(bn['food.markTried']) }).length).toBe(64)
  })

  test('step 2 is the passport book and step 3 has name, photo, formats, download and share', async () => {
    await renderApp('#/')
    expect(within(step('passport')).getByRole('group', { name: bn['book.label'] })).toBeInTheDocument()
    const dl = within(step('download'))
    expect(dl.getByLabelText(bn['share.nameLabel'])).toBeInTheDocument()
    expect(dl.getByRole('button', { name: bn['share.download'] })).toBeInTheDocument()
    expect(dl.getByRole('button', { name: bn['share.native'] })).toBeInTheDocument()
  })

  test('marking a food in step 1 shows up in the passport below it, with no page change', async () => {
    const { user } = await renderApp('#/')
    const before = window.location.hash
    await user.click(within(step('pick')).getByRole('button', { name: /কাটারিভোগ চাল/ }))
    expect(window.location.hash).toBe(before)
    const sealOrTick = step('passport').querySelectorAll('[data-shape="round"]')
    expect(sealOrTick.length).toBe(1)
  })

  test('the stepper jumps to each step', async () => {
    const { user } = await renderApp('#/')
    const nav = screen.getByRole('navigation', { name: bn['journey.steps'] })
    const buttons = within(nav).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual([expect.stringContaining(bn['journey.pickShort']), expect.stringContaining(bn['journey.passportShort']), expect.stringContaining(bn['journey.downloadShort'])])
    await user.click(buttons[2])
    expect(scrolled).toContain('download')
    await user.click(buttons[1])
    expect(scrolled).toContain('passport')
  })

  test('each step ends with a button to the next step', async () => {
    const { user } = await renderApp('#/')
    await user.click(within(step('pick')).getByRole('button', { name: new RegExp(bn['journey.next.passport']) }))
    expect(scrolled.at(-1)).toBe('passport')
    await user.click(within(step('passport')).getByRole('button', { name: new RegExp(bn['journey.next.download']) }))
    expect(scrolled.at(-1)).toBe('download')
  })

  test('the hero buttons start the flow and jump to the download step', async () => {
    const { user } = await renderApp('#/')
    const hero = screen.getByTestId('hero')
    await user.click(within(hero).getByRole('button', { name: bn['cta.start'] }))
    expect(scrolled.at(-1)).toBe('pick')
    await user.click(within(hero).getByRole('button', { name: bn['share.passport'] }))
    expect(scrolled.at(-1)).toBe('download')
  })

  test('the category chips filter the food list in place', async () => {
    const { user } = await renderApp('#/')
    const chips = screen.getByRole('navigation', { name: bn['home.categories'] })
    await user.click(within(chips).getByRole('button', { name: 'ভাত ও বিরিয়ানি' }))
    expect(screen.getByRole('combobox', { name: bn['discover.category'] })).toHaveValue('rice_biryani')
    expect(window.location.hash).toContain('cat=rice_biryani')
    expect(scrolled.at(-1)).toBe('pick')
  })
})

describe('menu: one Passport tab plus Challenges, Quiz and Leaderboard', () => {
  test('there is no separate Home, Discover or My Passport tab any more', async () => {
    await renderApp('#/')
    const main = screen.getAllByRole('navigation', { name: bn['nav.main'] })[0]
    expect(within(main).getAllByRole('link').map((a) => a.textContent)).toEqual([bn['nav.passport'], bn['nav.challenges'], bn['nav.quiz'], bn['nav.leaderboard']])
    expect(within(main).getByRole('link', { name: bn['nav.passport'] })).toHaveAttribute('aria-current', 'page')
  })

  test('old links still work and land on the right step', async () => {
    await renderApp('#/discover?cat=drinks')
    await waitFor(() => expect(window.location.hash).toBe('#/?cat=drinks'))
    expect(screen.getByRole('combobox', { name: bn['discover.category'] })).toHaveValue('drinks')
    expect(scrolled).toContain('pick')
  })

  test('/passport and /passport#share go to the passport and download steps', async () => {
    await renderApp('#/passport')
    await waitFor(() => expect(scrolled).toContain('passport'))
    scrolled.length = 0
    window.location.hash = '#/passport#share'
    await waitFor(() => expect(scrolled).toContain('download'))
    expect(foods).toHaveLength(64)
  })
})
