import { readFileSync } from 'node:fs'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'
import App from './App'
import { translations } from './data/translations'

const okFetch = async (url) => {
  const name = String(url).match(/data\/(\w+)\.json$/)?.[1]
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8')) }
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/'
  vi.stubGlobal('fetch', vi.fn(okFetch))
})
afterEach(() => vi.unstubAllGlobals())

test('shows a loading state, then the brand and the start CTA', async () => {
  render(<App />)
  expect(screen.getByText(translations.bn['common.loading'])).toBeInTheDocument()
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Food Passport Bangladesh')
  expect(screen.getByRole('link', { name: translations.bn['cta.start'] })).toBeInTheDocument()
})

test('language switcher flips the UI and persists the choice', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('heading', { level: 1 })
  await user.click(screen.getByRole('button', { name: 'English' }))
  expect(screen.getByRole('link', { name: translations.en['cta.start'] })).toBeInTheDocument()
  expect(document.documentElement.lang).toBe('en')
  expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).language).toBe('en')
})

test('shows a retry button when content fails to load', async () => {
  const user = userEvent.setup()
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
  render(<App />)
  const retry = await screen.findByRole('button', { name: translations.bn['common.retry'] })
  vi.stubGlobal('fetch', vi.fn(okFetch))
  await user.click(retry)
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument())
})

test('routes render and unknown paths fall back to a not-found page', async () => {
  window.location.hash = '#/nowhere'
  render(<App />)
  expect(await screen.findByText(translations.bn['notFound.title'])).toBeInTheDocument()
})
