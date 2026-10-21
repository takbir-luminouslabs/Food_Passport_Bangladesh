import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '../App'
import { translations } from '../data/translations'
import { okFetch, renderApp } from '../test/renderApp'

const bn = translations.bn

/** A stand-in for the Supabase client: just the few calls the site makes. */
function fakeClient({ user = null } = {}) {
  let listener
  const session = user ? { user } : null
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn((cb) => {
        listener = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signInWithOtp: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => {
        listener?.('SIGNED_OUT', null)
        return { error: null }
      }),
    },
    rpc: vi.fn(async () => ({ error: null })),
    from: () => ({ select: () => Object.assign(Promise.resolve({ data: [], error: null }), { maybeSingle: async () => ({ data: null, error: null }), eq: async () => ({ data: [], error: null }) }) }),
  }
}

async function renderWith(client, hash = '#/') {
  localStorage.clear()
  window.location.hash = hash
  vi.stubGlobal('fetch', vi.fn(okFetch))
  const user = userEvent.setup()
  render(<App authClient={client} />)
  await screen.findByRole('heading', { level: 1 })
  return { user }
}

const header = () => screen.getByRole('banner')

test('a site without cloud setup is the plain guest passport: no sign-in anywhere', async () => {
  await renderApp('#/')
  expect(within(header()).queryByRole('button', { name: bn['auth.signIn'] })).toBeNull()
  expect(screen.queryByText(bn['cloud.title'])).toBeNull()
})

test('with cloud setup, guests see a quiet Sign in button and can keep using the site', async () => {
  const { user } = await renderWith(fakeClient())
  expect(await within(header()).findByRole('button', { name: bn['auth.signIn'] })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: new RegExp(bn['cta.start']) }))
  expect(screen.getByTestId('hero')).toBeInTheDocument()
})

test('an email link is sent for a valid address, and an invalid one is stopped with a message', async () => {
  const client = fakeClient()
  const { user } = await renderWith(client)
  await user.click(await within(header()).findByRole('button', { name: bn['auth.signIn'] }))
  const dialog = screen.getByRole('dialog', { name: bn['auth.signIn'] })

  await user.type(within(dialog).getByLabelText(bn['auth.emailLabel']), 'not-an-email')
  await user.click(within(dialog).getByRole('button', { name: bn['auth.send'] }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent(bn['auth.invalidEmail'])
  expect(client.auth.signInWithOtp).not.toHaveBeenCalled()

  await user.clear(within(dialog).getByLabelText(bn['auth.emailLabel']))
  await user.type(within(dialog).getByLabelText(bn['auth.emailLabel']), 'rafi@example.com')
  await user.click(within(dialog).getByRole('button', { name: bn['auth.send'] }))
  expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
    email: 'rafi@example.com',
    options: { emailRedirectTo: expect.stringMatching(/^https?:\/\/[^#]+\/$/), shouldCreateUser: true },
  })
  expect(await screen.findByText(bn['auth.sent'].replace('{email}', 'rafi@example.com'))).toBeInTheDocument()
})

test('a failed send shows a clear error and keeps the form', async () => {
  const client = fakeClient()
  client.auth.signInWithOtp.mockResolvedValue({ error: new Error('rate limited') })
  const { user } = await renderWith(client)
  await user.click(await within(header()).findByRole('button', { name: bn['auth.signIn'] }))
  const dialog = screen.getByRole('dialog')
  await user.type(within(dialog).getByLabelText(bn['auth.emailLabel']), 'rafi@example.com')
  await user.click(within(dialog).getByRole('button', { name: bn['auth.send'] }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(bn['auth.failed'])
  expect(within(dialog).getByRole('button', { name: bn['auth.send'] })).toBeEnabled()
})

test('a signed-in person sees their email and can sign out', async () => {
  const client = fakeClient({ user: { id: 'u1', email: 'rafi@example.com' } })
  const { user } = await renderWith(client)
  await user.click(await within(header()).findByRole('button', { name: bn['auth.account'] }))
  const dialog = screen.getByRole('dialog', { name: bn['auth.account'] })
  expect(within(dialog).getByText('rafi@example.com')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: bn['auth.signOut'] }))
  expect(client.auth.signOut).toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(await within(header()).findByRole('button', { name: bn['auth.signIn'] })).toBeInTheDocument()
})

test('deleting the account asks first, can be cancelled, and then calls the server function', async () => {
  const client = fakeClient({ user: { id: 'u1', email: 'rafi@example.com' } })
  const { user } = await renderWith(client)
  await user.click(await within(header()).findByRole('button', { name: bn['auth.account'] }))
  let dialog = screen.getByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: bn['auth.delete'] }))
  expect(within(dialog).getByText(bn['auth.deleteWarn'])).toBeInTheDocument()
  expect(client.rpc).not.toHaveBeenCalledWith('delete_my_account')

  await user.click(within(dialog).getByRole('button', { name: bn['auth.cancel'] }))
  expect(within(dialog).queryByText(bn['auth.deleteWarn'])).toBeNull()
  expect(client.rpc).not.toHaveBeenCalledWith('delete_my_account')

  await user.click(within(dialog).getByRole('button', { name: bn['auth.delete'] }))
  dialog = screen.getByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: bn['auth.deleteConfirm'] }))
  expect(client.rpc).toHaveBeenCalledWith('delete_my_account')
  expect(client.auth.signOut).toHaveBeenCalled()
})

test('the download step offers saving to the cloud, and the privacy page explains what is stored', async () => {
  const { user } = await renderWith(fakeClient())
  expect(await screen.findByRole('region', { name: bn['cloud.title'] })).toBeInTheDocument()
  await user.click(within(screen.getByRole('region', { name: bn['cloud.title'] })).getByRole('button', { name: bn['cloud.cta'] }))
  expect(screen.getByRole('dialog', { name: bn['auth.signIn'] })).toBeInTheDocument()
})

test('privacy page stops saying nothing is sent to a server once accounts exist', async () => {
  await renderWith(fakeClient(), '#/privacy')
  await screen.findByRole('heading', { level: 2, name: bn['privacy.cloudTitle'] })
  expect(screen.queryByText(bn['privacy.storedBody'])).toBeNull()
  expect(screen.getByText(bn['privacy.storedBodyCloud'])).toBeInTheDocument()
  expect(screen.getByText(bn['privacy.cloudPublic'])).toBeInTheDocument()
  expect(screen.getByText(bn['privacy.cloudDelete'])).toBeInTheDocument()
  expect(screen.queryByText(bn['privacy.analyticsBody'])).toBeNull()
})

test('privacy page for a guest-only site is unchanged', async () => {
  await renderApp('#/privacy')
  expect(await screen.findByText(bn['privacy.storedBody'])).toBeInTheDocument()
  expect(screen.queryByText(bn['privacy.cloudPublic'])).toBeNull()
})

test('privacy page mentions accounts only when the site has them', async () => {
  await renderWith(fakeClient(), '#/privacy')
  expect(await screen.findByRole('heading', { level: 2, name: bn['privacy.cloudTitle'] })).toBeInTheDocument()
  expect(screen.getByText(bn['privacy.cloudBody'])).toBeInTheDocument()
})
