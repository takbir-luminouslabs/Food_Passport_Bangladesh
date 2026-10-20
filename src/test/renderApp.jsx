import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '../App'

export const okFetch = async (url) => {
  const name = String(url).match(/data\/(\w+)\.json$/)?.[1]
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8')) }
}

/** Render the whole app at a hash route with real catalogue data and a clean guest passport. */
export async function renderApp(hash = '#/', { state } = {}) {
  localStorage.clear()
  if (state) localStorage.setItem('food-passport-bangladesh:v1', JSON.stringify({ version: 1, language: 'bn', quizProgress: { correctIds: [] }, personalityResult: null, ...state }))
  window.location.hash = hash
  vi.stubGlobal('fetch', vi.fn(okFetch))
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('heading', { level: 1 })
  return { user }
}
