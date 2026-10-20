import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import { afterEach } from 'vitest'
import { vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { formatNumber, t } from '../utils/i18n'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const count = (n, lang = 'bn') => t(lang, 'discover.count', { n: formatNumber(n, lang) })
afterEach(() => vi.unstubAllGlobals())

test('lists the whole catalogue with a result count', async () => {
  await renderApp('#/discover')
  expect(screen.getByText(count(foods.length))).toBeInTheDocument()
  expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(foods.length)
})

test('search works in English, Bengali and by district', async () => {
  const { user } = await renderApp('#/discover')
  const box = screen.getByRole('searchbox', { name: translations.bn['discover.searchLabel'] })
  await user.type(box, 'katarivog')
  expect(screen.getByText(count(1))).toBeInTheDocument()
  await user.clear(box)
  await user.type(box, 'কাটারিভোগ চাল')
  expect(screen.getByText(count(1))).toBeInTheDocument()
  await user.clear(box)
  await user.type(box, 'Natore')
  expect(screen.getByRole('link', { name: /Kacha Gola|কাঁচাগোল্লা/ })).toBeInTheDocument()
})

test('shows an empty state with a way to clear filters', async () => {
  const { user } = await renderApp('#/discover')
  await user.type(screen.getByRole('searchbox'), 'zzzzzz')
  expect(screen.getByText(translations.bn['discover.empty'])).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: translations.bn['discover.clear'] }))
  expect(screen.getByText(count(foods.length))).toBeInTheDocument()
})

test('category filter', async () => {
  const { user } = await renderApp('#/discover')
  await user.selectOptions(screen.getByLabelText(translations.bn['discover.category']), 'rice_biryani')
  expect(screen.getByText(count(foods.filter((f) => f.category === 'rice_biryani').length))).toBeInTheDocument()
})

test('marking a food as tried awards XP, shows a toast and updates the tried filter', async () => {
  const { user } = await renderApp('#/discover')
  await user.type(screen.getByRole('searchbox'), 'katarivog')
  const btn = screen.getByRole('button', { pressed: false, name: /কাটারিভোগ/ })
  await user.click(btn)
  expect(screen.getByRole('button', { pressed: true, name: /কাটারিভোগ/ })).toBeInTheDocument()
  expect(await screen.findByText(t('bn', 'toast.xp', { xp: formatNumber(10, 'bn') }))).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toEqual(['dinajpur-katarivog'])

  await user.clear(screen.getByRole('searchbox'))
  await user.click(screen.getByRole('radio', { name: translations.bn['discover.statusTried'] }))
  expect(screen.getByText(count(1))).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: translations.bn['discover.statusNotTried'] }))
  expect(screen.getByText(count(foods.length - 1))).toBeInTheDocument()
})

test('toast can be dismissed', async () => {
  const { user } = await renderApp('#/discover')
  await user.type(screen.getByRole('searchbox'), 'katarivog')
  await user.click(screen.getByRole('button', { pressed: false, name: /কাটারিভোগ/ }))
  const toast = await screen.findByText(t('bn', 'toast.xp', { xp: formatNumber(10, 'bn') }))
  await user.click(within(toast.closest('[role="status"]')).getByRole('button', { name: translations.bn['common.close'] }))
  expect(screen.queryByText(t('bn', 'toast.xp', { xp: formatNumber(10, 'bn') }))).toBeNull()
})

test('filters live in the URL so back/forward keep them', async () => {
  const { user } = await renderApp('#/discover')
  await user.type(screen.getByRole('searchbox'), 'bogura')
  expect(window.location.hash).toContain('q=bogura')
})

describe('food detail', () => {
  test('shows both names, description, category, XP and region note', async () => {
    await renderApp('#/discover/dinajpur-katarivog')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('কাটারিভোগ চাল')
    expect(screen.getByText('Katarivog Rice')).toBeInTheDocument()
    expect(screen.getByText(t('bn', 'food.region', { district: 'দিনাজপুর' }))).toBeInTheDocument()
    expect(screen.getByText(translations.bn['food.unverified'])).toBeInTheDocument()
    expect(screen.getByRole('button', { pressed: false, name: /কাটারিভোগ চাল/ })).toBeInTheDocument()
  })

  test('hides a low-confidence region', async () => {
    await renderApp('#/discover/kishoreganj-haor-fish-curry')
    expect(screen.queryByText(/কিশোরগঞ্জ-এর সঙ্গে/)).toBeNull()
    expect(screen.queryByText(translations.bn['food.unverified'])).toBeNull()
  })

  test('unknown food id shows a friendly not-found message', async () => {
    await renderApp('#/discover/does-not-exist')
    expect(screen.getByText(translations.bn['food.notFound'])).toBeInTheDocument()
  })
})
