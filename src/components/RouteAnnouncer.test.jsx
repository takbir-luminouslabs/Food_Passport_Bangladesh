import { screen, waitFor, within } from '@testing-library/react'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'

const bn = translations.bn
const SITE = 'Food Passport Bangladesh'

test('the first page load does not steal focus, but sets a descriptive page title', async () => {
  await renderApp('#/challenges')
  expect(document.activeElement).toBe(document.body)
  await waitFor(() => expect(document.title).toBe(`${bn['challenges.title']} · ${SITE}`))
})

test('navigating moves focus to the main content, updates the title and announces the new page', async () => {
  const { user } = await renderApp('#/')
  const nav = screen.getAllByRole('navigation', { name: bn['nav.main'] })[0]
  await user.click(within(nav).getByRole('link', { name: bn['nav.challenges'] }))
  await waitFor(() => expect(document.title).toContain(bn['challenges.title']))
  expect(document.activeElement).toBe(screen.getByRole('main'))
  expect(screen.getByTestId('route-announcer')).toHaveTextContent(bn['challenges.title'])
})

test('a food page is titled with the food name', async () => {
  await renderApp('#/discover/dinajpur-katarivog')
  await waitFor(() => expect(document.title).toBe(`কাটারিভোগ চাল · ${SITE}`))
})

test('the live region is polite and visually hidden', async () => {
  await renderApp('#/')
  const live = screen.getByTestId('route-announcer')
  expect(live).toHaveAttribute('aria-live', 'polite')
  expect(live).toHaveClass('sr-only')
})
