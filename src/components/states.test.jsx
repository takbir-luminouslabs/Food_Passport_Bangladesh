import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { translations } from '../data/translations'
import App from '../App'
import { okFetch, renderApp } from '../test/renderApp'
import ErrorBoundary from './ErrorBoundary'
import LoadingState from './LoadingState'

const bn = translations.bn

describe('LoadingState', () => {
  test('is an accessible busy status with a text label, and a decorative spinner', () => {
    render(<LoadingState label="Loading…" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Loading…')
    expect(status).toHaveAttribute('aria-busy', 'true')
    const spinner = status.querySelector('[data-spinner]')
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
    expect(spinner.className).toContain('motion-reduce:animate-none')
  })
})

describe('ErrorBoundary', () => {
  const Boom = () => { throw new Error('boom') }
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  test('shows a friendly alert with a reload button instead of a blank screen', () => {
    const reload = vi.fn()
    render(<ErrorBoundary message="Something broke" reloadLabel="Reload" onReload={reload}><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something broke')
    screen.getByRole('button', { name: 'Reload' }).click()
    expect(reload).toHaveBeenCalled()
  })

  test('renders children normally when nothing fails', () => {
    render(<ErrorBoundary message="x" reloadLabel="y"><p>fine</p></ErrorBoundary>)
    expect(screen.getByText('fine')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('app states', () => {
  test('while the catalogue loads, a labelled loading state shows; a failed load shows an error with a working retry', async () => {
    const fetchFn = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementation(okFetch)
    localStorage.clear()
    window.location.hash = '#/'
    render(<App fetchFn={fetchFn} />)
    expect(screen.getByRole('status')).toHaveTextContent(bn['common.loading'])
    expect(await screen.findByRole('alert')).toHaveTextContent(bn['common.error'])
    await userEvent.setup().click(screen.getByRole('button', { name: bn['common.retry'] }))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByText(bn['common.error'])).toBeNull()
  })

  test('an unknown food page says so and links back', async () => {
    await renderApp('#/discover/not-a-real-food')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(bn['food.notFound'])
    expect(screen.getByRole('link', { name: bn['food.back'] })).toBeInTheDocument()
  })

  test('an unknown route shows the not-found page', async () => {
    await renderApp('#/nope/nothing')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(bn['notFound.title'])
  })

  test('a search with no matches shows an empty state', async () => {
    const { user } = await renderApp('#/discover')
    await user.type(screen.getByRole('searchbox'), 'zzzzqqq')
    expect(await screen.findByText(bn['discover.empty'])).toBeInTheDocument()
  })
})
