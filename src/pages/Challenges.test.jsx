import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const challenges = JSON.parse(readFileSync('public/data/challenges.json', 'utf8'))
const pitha = foods.filter((f) => f.category === 'pitha_snacks').map((f) => f.id)
const bn = translations.bn
afterEach(() => vi.unstubAllGlobals())

const card = (title) => screen.getByRole('article', { name: title })

test('lists every active challenge with description, reward and type', async () => {
  await renderApp('#/challenges')
  expect(screen.getAllByRole('article')).toHaveLength(challenges.length)
  const c = card('২টি পিঠা')
  expect(within(c).getByText('২টি আলাদা পিঠা বা ঐতিহ্যবাহী নাস্তা চেখে দেখুন।')).toBeInTheDocument()
  expect(within(c).getByText('পুরস্কার: ২৫ XP')).toBeInTheDocument()
  expect(within(c).getByText(bn['challenge.type.collection'])).toBeInTheDocument()
})

test('shows progress toward completion with a text label', async () => {
  await renderApp('#/challenges', { state: { triedFoodIds: pitha.slice(0, 1) } })
  const c = card('২টি পিঠা')
  const bar = within(c).getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '1')
  expect(bar).toHaveAttribute('aria-valuemax', '2')
  expect(within(c).getByText('১/২')).toBeInTheDocument()
  expect(within(c).queryByText(bn['challenge.completed'])).toBeNull()
})

test('marks completed challenges clearly and updates the summary', async () => {
  await renderApp('#/challenges', { state: { triedFoodIds: pitha } })
  const c = card('২টি পিঠা')
  expect(within(c).getByText(bn['challenge.completed'])).toBeInTheDocument()
  expect(screen.getByText(bn['challenges.summary'].replace('{done}', '৩').replace('{total}', '৮'))).toBeInTheDocument()
})

test('links to foods relevant to the challenge', async () => {
  await renderApp('#/challenges')
  const link = within(card('২টি পিঠা')).getByRole('link', { name: bn['challenge.findFoods'] })
  expect(link).toHaveAttribute('href', expect.stringContaining('cat=pitha_snacks'))
  const col = within(card('প্রথম কালেকশন সম্পূর্ণ')).getByRole('link', { name: bn['challenge.viewPassport'] })
  expect(col).toHaveAttribute('href', '#/passport')
})
