import { render, renderHook, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../App'
import { AuthContext } from '../context/auth-context'
import { useCountDownload } from '../hooks/useCountDownload'
import { translations } from '../data/translations'
import { okFetch, renderApp } from '../test/renderApp'

const bn = translations.bn

function fakeClient({ stats = { users: 12, visitors: 340, downloads: 57 }, failStats = false, presence = 3 } = {}) {
  const channel = {
    handlers: [],
    on(_t, _f, cb) { this.handlers.push(cb); return this },
    subscribe(cb) { queueMicrotask(() => { cb('SUBSCRIBED'); this.handlers.forEach((h) => h()) }); return this },
    track: vi.fn(),
    presenceState: () => Object.fromEntries(Array.from({ length: presence }, (_, i) => [`k${i}`, [{}]])),
  }
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn(async (name) => (name === 'get_site_stats' ? (failStats ? { data: null, error: new Error('x') } : { data: stats, error: null }) : { data: null, error: null })),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    _channel: channel,
  }
}

async function open(client) {
  localStorage.clear()
  window.location.hash = '#/'
  vi.stubGlobal('fetch', vi.fn(okFetch))
  render(<App authClient={client} />)
  await screen.findByRole('heading', { level: 1 })
}

afterEach(() => Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true }))

test('the footer shows online now, visitors, members and downloaded passports', async () => {
  const c = fakeClient()
  await open(c)
  const box = await screen.findByRole('region', { name: bn['stats.title'] })
  expect(box).toHaveTextContent(`৩ ${bn['stats.online']}`)
  expect(box).toHaveTextContent(`৩৪০ ${bn['stats.visitors']}`)
  expect(box).toHaveTextContent(`১২ ${bn['stats.users']}`)
  expect(box).toHaveTextContent(`৫৭ ${bn['stats.downloads']}`)
})

test('a visit is recorded with a random id that stays the same next time, and tells nothing about the person', async () => {
  const c = fakeClient()
  await open(c)
  await screen.findByRole('region', { name: bn['stats.title'] })
  const id = localStorage.getItem('food-passport-bangladesh:visitor')
  expect(id).toMatch(/^[0-9a-f-]{36}$/)
  expect(c.rpc).toHaveBeenCalledWith('record_visit', { p_visitor: id })
  expect(c.channel).toHaveBeenCalledWith('site-online', { config: { presence: { key: id } } })
  expect(c._channel.track).toHaveBeenCalledWith({})   // presence carries no data at all
})

test('Do Not Track: not counted, nothing stored, but the totals still show', async () => {
  Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true })
  const c = fakeClient()
  await open(c)
  await screen.findByRole('region', { name: bn['stats.title'] })
  expect(c.rpc).not.toHaveBeenCalledWith('record_visit', expect.anything())
  expect(c._channel.track).not.toHaveBeenCalled()
  expect(localStorage.getItem('food-passport-bangladesh:visitor')).toBeNull()
})

test('no numbers when the site has no online setup, or when they cannot be loaded', async () => {
  await renderApp('#/')
  expect(screen.queryByRole('region', { name: bn['stats.title'] })).toBeNull()
  const c = fakeClient({ failStats: true })
  await open(c)
  await new Promise((r) => setTimeout(r, 30))
  expect(screen.queryByRole('region', { name: bn['stats.title'] })).toBeNull()
})

test('downloading a passport counts this browser once via record_download', async () => {
  localStorage.clear()
  const client = { rpc: vi.fn(async () => ({ data: null, error: null })) }
  const wrapper = ({ children }) => <AuthContext.Provider value={{ enabled: true, client, user: null }}>{children}</AuthContext.Provider>
  const { result } = renderHook(() => useCountDownload(), { wrapper })
  result.current()
  await Promise.resolve()
  expect(client.rpc).toHaveBeenCalledWith('record_download', { p_visitor: localStorage.getItem('food-passport-bangladesh:visitor') })
  const none = renderHook(() => useCountDownload())   // no online setup: silently does nothing
  expect(() => none.result.current()).not.toThrow()
})
