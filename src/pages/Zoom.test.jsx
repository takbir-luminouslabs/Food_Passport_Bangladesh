import { screen, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { t } from '../utils/i18n'

const bn = translations.bn
afterEach(() => vi.unstubAllGlobals())

describe('Home cover', () => {
  test('click floats the cover up in a dialog; Esc brings it back and returns focus', async () => {
    const { user } = await renderApp('#/')
    const cover = screen.getByRole('button', { name: new RegExp(`${bn['passport.cover.enlarge']}$`) })
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(cover)
    const dialog = screen.getByRole('dialog', { name: bn['passport.cover.label'] })
    expect(within(dialog).getByText(bn['dialog.hint'])).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(cover).toHaveFocus()
  })

  test('works from the keyboard', async () => {
    const { user } = await renderApp('#/')
    screen.getByRole('button', { name: new RegExp(`${bn['passport.cover.enlarge']}$`) }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('there is still exactly one h1 and the start CTA is reachable', async () => {
    await renderApp('#/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('button', { name: bn['cta.start'] })).toBeInTheDocument()
  })
})

describe('Passport visa pages', () => {
  const name = 'ভাত ও বিরিয়ানি'
  const enlarge = () => screen.getByRole('button', { name: t('bn', 'passport.page.enlarge', { name }) })

  test('each page has a page number', async () => {
    await renderApp('#/passport')
    const region = screen.getByRole('region', { name })
    expect(within(region).getByText(t('bn', 'passport.page', { n: '০১' }))).toBeInTheDocument()
  })

  test('the enlarge button floats that page up with its stamps', async () => {
    const { user } = await renderApp('#/passport', { state: { triedFoodIds: ['dinajpur-katarivog'] } })
    await user.click(enlarge())
    const dialog = screen.getByRole('dialog', { name })
    expect(within(dialog).getAllByRole('link')).toHaveLength(3)
    expect(within(dialog).getAllByText(new RegExp(`${bn['stamp.collected']}$`))).toHaveLength(1)
  })

  test('clicking the page itself also enlarges it, but clicking a stamp just opens that food', async () => {
    const { user } = await renderApp('#/passport')
    await user.click(screen.getByRole('heading', { name }))
    expect(screen.getByRole('dialog', { name })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    const region = screen.getByRole('region', { name })
    await user.click(within(region).getByRole('link', { name: /কাটারিভোগ চাল/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.location.hash).toBe('#/discover/dinajpur-katarivog')
  })

  test('a stamp inside the enlarged page opens the food and closes the dialog', async () => {
    const { user } = await renderApp('#/passport')
    await user.click(enlarge())
    await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: /কাটারিভোগ চাল/ }))
    expect(window.location.hash).toBe('#/discover/dinajpur-katarivog')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('decorative passport-style text is hidden from assistive tech', async () => {
    await renderApp('#/passport')
    const region = screen.getByRole('region', { name })
    const mrz = region.querySelector('[data-mrz]')
    expect(mrz).toHaveAttribute('aria-hidden', 'true')
    expect(mrz.textContent).toMatch(/^[A-Z0-9<]{44}$/)
  })
})
