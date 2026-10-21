import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import DonationSection from '../components/DonationSection'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const pitha = foods.filter((f) => f.category === 'pitha_snacks').map((f) => f.id)
const bn = translations.bn
afterEach(() => vi.unstubAllGlobals())

const section = (name) => screen.getByRole('region', { name })

test('new visitors see onboarding and a start CTA', async () => {
  await renderApp('#/')
  expect(screen.getByRole('button', { name: bn['cta.start'] })).toBeInTheDocument()
  expect(screen.getByText(bn['hero.onboarding'])).toBeInTheDocument()
})

test('the hero has a badge, a collage of real food photos and exactly one h1', async () => {
  await renderApp('#/')
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  const hero = screen.getByTestId('hero')
  expect(within(hero).getByText(bn['hero.badge'])).toBeInTheDocument()
  const prints = hero.querySelectorAll('[data-print] img')
  expect(prints.length).toBeGreaterThanOrEqual(5)
  for (const img of prints) expect(img).toHaveAttribute('alt', '')
  expect(within(hero).getByRole('button', { name: bn['cta.start'] })).toBeInTheDocument()
})

test('hero has no floating food pictures, and a row of food-category shortcuts', async () => {
  await renderApp('#/')
  const hero = screen.getByTestId('hero')
  expect(hero.querySelectorAll('[data-dish]')).toHaveLength(0)
  const nav = screen.getByRole('navigation', { name: bn['home.categories'] })
  expect(within(nav).getAllByRole('button')).toHaveLength(7)
  expect(within(nav).getByRole('button', { name: 'ভাত ও বিরিয়ানি' })).toBeInTheDocument()
})

test('the footer ends with the illustrated hills', async () => {
  await renderApp('#/')
  expect(document.querySelector('footer svg[data-scene="hills"]')).not.toBeNull()
})

test('returning guests see saved progress, level bar and the continue CTA', async () => {
  await renderApp('#/', { state: { triedFoodIds: pitha.slice(0, 1) } })
  expect(screen.getByRole('button', { name: bn['cta.continue'] })).toBeInTheDocument()
  const progress = section(bn['home.progress'])
  expect(within(progress).getByText('১০')).toBeInTheDocument()
  const bar = within(progress).getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '10')
  expect(within(progress).getByText(bn['xp.howTo'])).toBeInTheDocument()
})

test('shows the next closest challenge', async () => {
  await renderApp('#/', { state: { triedFoodIds: pitha.slice(0, 1) } })
  expect(within(section(bn['home.nextChallenge'])).getByText('২টি পিঠা')).toBeInTheDocument()
})

test('previews achievements', async () => {
  await renderApp('#/', { state: { triedFoodIds: pitha.slice(0, 1) } })
  expect(within(section(bn['home.badges'])).getByText(/প্রথম কামড়/)).toBeInTheDocument()
})

test('shows the donation section, clearly optional and PIN-safe', async () => {
  await renderApp('#/')
  const d = section(bn['donation.title'])
  expect(within(d).getByText(bn['donation.optional'])).toBeInTheDocument()
  expect(within(d).getByText(bn['donation.safety'])).toBeInTheDocument()
})

describe('DonationSection', () => {
  const show = (props) => render(<DonationSection lang="en" t={(k) => translations.en[k]} {...props} />)

  test('the bKash Bangla QR opens in a floating dialog on click, and there is no copy button without a number', async () => {
    const user = userEvent.setup()
    show({ number: '' })
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByRole('button', { name: translations.en['donation.copy'] })).toBeNull()
    await user.click(screen.getByRole('button', { name: translations.en['donation.showQr'] }))
    const dialog = screen.getByRole('dialog', { name: translations.en['donation.qrLabel'] })
    expect(within(dialog).getByRole('img', { name: translations.en['donation.qrAlt'] })).toHaveAttribute('src', 'images/bkash-qr.jpg')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('shows the number and copies it to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    show({ number: '01700000000' })
    expect(screen.getByText('01700000000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: translations.en['donation.copy'] }))
    expect(writeText).toHaveBeenCalledWith('01700000000')
    expect(await screen.findByText(translations.en['donation.copied'])).toBeInTheDocument()
  })

  test('copy failure does not crash', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('x')) }, configurable: true })
    show({ number: '01700000000' })
    await user.click(screen.getByRole('button', { name: translations.en['donation.copy'] }))
    expect(screen.getByText('01700000000')).toBeInTheDocument()
  })
})
