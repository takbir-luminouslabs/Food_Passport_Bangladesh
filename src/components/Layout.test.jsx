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
    for (const k of ['home', 'discover', 'passport', 'challenges', 'quiz', 'leaderboard']) {
      expect(within(nav).getByRole('link', { name: new RegExp(translations.bn[`nav.${k}`]) })).toBeInTheDocument()
    }
  }
})

test('current page is marked for assistive tech', async () => {
  await renderApp('#/discover')
  const nav = screen.getByRole('navigation', { name: translations.bn['nav.main'] })
  expect(within(nav).getByRole('link', { name: translations.bn['nav.discover'] })).toHaveAttribute('aria-current', 'page')
})
