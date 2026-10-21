import { screen, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'

afterEach(() => vi.unstubAllGlobals())

test('footer has the brand, tagline, copyright and legal links, and no third-party attribution', async () => {
  await renderApp('#/')
  const footer = screen.getByRole('contentinfo')
  expect(within(footer).getByText(translations.bn['brand.tagline'])).toBeInTheDocument()
  expect(within(footer).getByText(translations.bn['footer.copyright'])).toBeInTheDocument()
  expect(within(footer).getByText(translations.bn['footer.madeWith'])).toBeInTheDocument()
  expect(within(footer).getByRole('link', { name: translations.bn['footer.privacy'] })).toBeInTheDocument()
  expect(within(footer).getByRole('link', { name: translations.bn['footer.sources'] })).toBeInTheDocument()
  expect(footer).not.toHaveTextContent(/unseen/i)
  expect(within(footer).queryAllByRole('link', { name: /unseen/i })).toEqual([])
})

test('has a main navigation and a mobile quick navigation with every section', async () => {
  await renderApp('#/')
  for (const label of ['nav.main', 'nav.quick']) {
    const nav = screen.getByRole('navigation', { name: translations.bn[label] })
    for (const k of ['passport', 'challenges', 'quiz', 'leaderboard']) {
      expect(within(nav).getByRole('link', { name: new RegExp(translations.bn[`nav.${k}`]) })).toBeInTheDocument()
    }
  }
})

test('current page is marked for assistive tech', async () => {
  await renderApp('#/')
  const nav = screen.getByRole('navigation', { name: translations.bn['nav.main'] })
  expect(within(nav).getByRole('link', { name: translations.bn['nav.passport'] })).toHaveAttribute('aria-current', 'page')
})

test('the footer starts with a decorative strip of real food photos', async () => {
  await renderApp('#/')
  const strip = within(screen.getByRole('contentinfo')).getByTestId('footer-strip')
  expect(strip).toHaveAttribute('aria-hidden', 'true')
  const imgs = strip.querySelectorAll('img')
  expect(imgs.length).toBe(20) // ten photos, listed twice for a seamless loop
  expect(new Set([...imgs].map((i) => i.getAttribute('src'))).size).toBe(10)
  for (const img of imgs) {
    expect(img).toHaveAttribute('alt', '')
    expect(img.getAttribute('src')).toMatch(/^images\/foods\//)
  }
})

test('the photo strip is a banner with a heading line and a start button that goes to the food picker', async () => {
  const { user } = await renderApp('#/quiz')
  const banner = within(screen.getByRole('contentinfo')).getByTestId('footer-banner')
  expect(within(banner).getByText(translations.bn['footer.banner'])).toBeInTheDocument()
  await user.click(within(banner).getByRole('link', { name: translations.bn['cta.start'] }))
  expect(window.location.hash).toBe('#/')
})
