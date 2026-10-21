import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '../App'
import { translations } from '../data/translations'
import { okFetch, renderApp } from '../test/renderApp'

const bn = translations.bn
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k])

const row = (rank, name, xp, extra = {}) => ({ rank, public_id: `pub-${rank}`, display_name: name, xp, stamps: rank + 2, badges: 1, is_me: false, ...extra })

function client({ user = null, pages = [[row(1, 'Chitra', 320), row(2, 'Bilal', 120, { is_me: true }), row(3, 'Ayesha', 20)]], total, mine, fail = false, reportError = null } = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: user ? { user } : null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: () => ({ select: () => Object.assign(Promise.resolve({ data: [], error: null }), { eq: async () => ({ data: [], error: null }), maybeSingle: async () => ({ data: null, error: null }) }) }),
    rpc: vi.fn(async (name, args) => {
      if (name === 'get_leaderboard') {
        if (fail) return { data: null, error: new Error('down') }
        const page = pages[Math.floor(args.p_offset / 50)] ?? []
        return { data: { rows: page, total: total ?? pages.flat().length }, error: null }
      }
      if (name === 'my_leaderboard_rank') return { data: mine ?? { xp: 0, rank: null, on_board: false }, error: null }
      if (name === 'report_display_name') return { data: null, error: reportError }
      return { data: null, error: null }
    }),
  }
}

async function open(c) {
  localStorage.clear()
  window.location.hash = '#/leaderboard'
  vi.stubGlobal('fetch', vi.fn(okFetch))
  const user = userEvent.setup()
  render(<App authClient={c} />)
  return { user }
}

test('without online accounts the page stays the "coming soon" placeholder', async () => {
  await renderApp('#/leaderboard')
  expect(screen.getByText(bn['coming.soon'])).toBeInTheDocument()
})

test('shows the ranking with name, level, XP and stamps, explains the rules, and exposes nothing private', async () => {
  await open(client())
  const list = await screen.findByRole('list')
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(within(items[0]).getByText('Chitra')).toBeInTheDocument()
  expect(items[0]).toHaveTextContent(fmt(bn['lb.level'], { n: 3 }))   // 320 XP is level 3
  expect(items[0]).toHaveTextContent(/৩২০ এক্সপি/)
  expect(items[1]).toHaveAttribute('aria-current', 'true')            // the viewer's own row is marked
  expect(screen.getByText(bn['lb.lead'])).toBeInTheDocument()
  expect(screen.getByText(bn['lb.rules'])).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/@/)
})

test('a guest is invited to sign in; nobody can report without an account', async () => {
  await open(client())
  expect(await screen.findByRole('button', { name: bn['lb.signIn'] })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: new RegExp(bn['lb.report']) })).toBeNull()
})

test('a signed-in person who is not listed sees where they would be, only to themselves, and can join', async () => {
  const user = { id: 'u1', email: 'rafi@example.com' }
  const { user: ui } = await open(client({ user, mine: { xp: 40, rank: 3, on_board: false } }))
  expect(await screen.findByText(fmt(bn['lb.youWould'], { rank: '৩', xp: '৪০' }))).toBeInTheDocument()
  await ui.click(screen.getByRole('button', { name: bn['lb.join'] }))
  expect(await screen.findByRole('dialog', { name: bn['auth.account'] })).toBeInTheDocument()
})

test('a listed person sees their place', async () => {
  const user = { id: 'u1', email: 'rafi@example.com' }
  await open(client({ user, mine: { xp: 120, rank: 2, on_board: true } }))
  expect(await screen.findByText(fmt(bn['lb.youOn'], { rank: '২', xp: '১২০' }))).toBeInTheDocument()
})

test('reporting a name asks first, then sends the public handle only', async () => {
  const user = { id: 'u1', email: 'rafi@example.com' }
  const c = client({ user })
  const { user: ui } = await open(c)
  const first = (await screen.findAllByRole('listitem'))[0]
  await ui.click(within(first).getByRole('button', { name: new RegExp(bn['lb.report']) }))
  expect(c.rpc).not.toHaveBeenCalledWith('report_display_name', expect.anything())
  await ui.click(within(first).getByRole('button', { name: bn['lb.reportYes'] }))
  expect(c.rpc).toHaveBeenCalledWith('report_display_name', { p_public_id: 'pub-1' })
  expect(await within(first).findByText(bn['lb.reported'])).toBeInTheDocument()
  // your own row cannot be reported
  expect(within((await screen.findAllByRole('listitem'))[1]).queryByRole('button')).toBeNull()
})

test('50 at a time: "show more" loads the next page and then goes away', async () => {
  const page1 = Array.from({ length: 50 }, (_, i) => row(i + 1, `User ${i + 1}`, 500 - i))
  const page2 = [row(51, 'Last One', 5)]
  const c = client({ pages: [page1, page2], total: 51 })
  const { user } = await open(c)
  await screen.findByText('User 1')
  expect(screen.getAllByRole('listitem')).toHaveLength(50)
  await user.click(screen.getByRole('button', { name: bn['lb.more'] }))
  expect(await screen.findByText('Last One')).toBeInTheDocument()
  expect(c.rpc).toHaveBeenCalledWith('get_leaderboard', { p_limit: 50, p_offset: 50 })
  expect(screen.queryByRole('button', { name: bn['lb.more'] })).toBeNull()
})

test('an empty board and a failed load both say so, and the failure can be retried', async () => {
  await open(client({ pages: [[]] }))
  expect(await screen.findByText(bn['lb.empty'])).toBeInTheDocument()
})
test('a failed load shows a message with a retry button', async () => {
  await open(client({ fail: true }))
  expect(await screen.findByRole('alert')).toHaveTextContent(bn['lb.error'])
  expect(screen.getByRole('button', { name: bn['common.retry'] })).toBeInTheDocument()
})
