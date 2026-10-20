import { screen } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'

const bn = translations.bn
afterEach(() => vi.unstubAllGlobals())

test('explains local storage, user control, analytics and food data caveats', async () => {
  await renderApp('#/privacy')
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(bn['privacy.title'])
  for (const k of ['storedTitle', 'controlTitle', 'analyticsTitle', 'sourcesTitle', 'donationTitle']) {
    expect(screen.getByRole('heading', { level: 2, name: bn[`privacy.${k}`] })).toBeInTheDocument()
  }
  expect(screen.getByText(bn['privacy.storedBody'])).toBeInTheDocument()
  expect(screen.getByText(bn['tracking.disclaimer'])).toBeInTheDocument()
})

test('lists the sources used in the food data', async () => {
  await renderApp('#/privacy')
  const link = screen.getByRole('link', { name: 'commons.wikimedia.org' })
  expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\/commons\.wikimedia\.org\//))
  expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
})
