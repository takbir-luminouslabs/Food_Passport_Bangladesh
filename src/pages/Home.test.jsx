import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import DonationSection from '../components/DonationSection'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const street = foods.filter((f) => f.category === 'street_food').map((f) => f.id)
const bn = translations.bn
afterEach(() => vi.unstubAllGlobals())

const section = (name) => screen.getByRole('region', { name })

test('new visitors see onboarding and a start CTA', async () => {
  await renderApp('#/')
  expect(screen.getByRole('link', { name: bn['cta.start'] })).toBeInTheDocument()
  expect(screen.getByText(bn['hero.onboarding'])).toBeInTheDocument()
})

test('returning guests see saved progress, level bar and the continue CTA', async () => {
  await renderApp('#/', { state: { triedFoodIds: street.slice(0, 1) } })
  expect(screen.getByRole('link', { name: bn['cta.continue'] })).toBeInTheDocument()
  const progress = section(bn['home.progress'])
  expect(within(progress).getByText('১০')).toBeInTheDocument()
  const bar = within(progress).getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '10')
  expect(within(progress).getByText(bn['xp.howTo'])).toBeInTheDocument()
})

test('recommends four untried foods from different categories', async () => {
  await renderApp('#/', { state: { triedFoodIds: ['chotpoti'] } })
  const rec = within(section(bn['home.recommended']))
  const links = rec.getAllByRole('link').filter((l) => l.getAttribute('href').startsWith('#/discover/'))
  expect(links).toHaveLength(4)
  expect(links.map((l) => l.getAttribute('href'))).not.toContain('#/discover/chotpoti')
})

test('shows the next closest challenge', async () => {
  await renderApp('#/', { state: { triedFoodIds: street.slice(0, 1) } })
  expect(within(section(bn['home.nextChallenge'])).getByText('২টি স্ট্রিট ফুড')).toBeInTheDocument()
})

test('previews collections and achievements', async () => {
  await renderApp('#/', { state: { triedFoodIds: street.slice(0, 1) } })
  expect(within(section(bn['home.collections'])).getAllByRole('progressbar').length).toBeGreaterThan(0)
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

  test('does not show a number until one is configured/verified', () => {
    show({ number: '' })
    expect(screen.getByText(translations.en['donation.pending'])).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
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
