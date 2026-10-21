import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '../App'
import { translations } from '../data/translations'
import { okFetch } from '../test/renderApp'

const bn = translations.bn

function account({ profile = { display_name: null, leaderboard_opt_in: false, name_hidden: false }, rpcResult } = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u1', email: 'rafi@example.com' } } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: () => ({
      select: () => Object.assign(Promise.resolve({ data: [], error: null }), {
        eq: async () => ({ data: [], error: null }),
        maybeSingle: async () => ({ data: profile, error: null }),
      }),
    }),
    rpc: vi.fn(rpcResult ?? (async (name, args) =>
      name === 'set_my_profile'
        ? { data: { display_name: args.p_name, leaderboard_opt_in: args.p_opt_in, name_hidden: false }, error: null }
        : { data: null, error: null })),
  }
}

async function open(client) {
  localStorage.clear()
  window.location.hash = '#/'
  vi.stubGlobal('fetch', vi.fn(okFetch))
  const user = userEvent.setup()
  render(<App authClient={client} />)
  await screen.findByRole('heading', { level: 1 })
  await user.click(await within(screen.getByRole('banner')).findByRole('button', { name: bn['auth.account'] }))
  return { user, dialog: await screen.findByRole('dialog', { name: bn['auth.account'] }) }
}

test('the leaderboard switch is off by default and saving sends the cleaned name and choice', async () => {
  const client = account()
  const { user, dialog } = await open(client)
  const box = await within(dialog).findByRole('checkbox', { name: new RegExp(bn['profile.optIn']) })
  expect(box).not.toBeChecked()
  await user.type(within(dialog).getByLabelText(bn['profile.nameLabel']), '  Rafi   Ahmed ')
  await user.click(box)
  await user.click(within(dialog).getByRole('button', { name: bn['profile.save'] }))
  expect(client.rpc).toHaveBeenCalledWith('set_my_profile', { p_name: 'Rafi Ahmed', p_opt_in: true })
  expect(await within(dialog).findByText(bn['profile.saved'])).toBeInTheDocument()
})

test('an existing name and choice are shown, and a hidden name explains itself', async () => {
  const { dialog } = await open(account({ profile: { display_name: 'Shakib', leaderboard_opt_in: true, name_hidden: true } }))
  expect(await within(dialog).findByLabelText(bn['profile.nameLabel'])).toHaveValue('Shakib')
  expect(within(dialog).getByRole('checkbox')).toBeChecked()
  expect(within(dialog).getByText(bn['profile.hidden'])).toBeInTheDocument()
})

test('obvious mistakes are stopped before anything is sent', async () => {
  const client = account()
  const { user, dialog } = await open(client)
  const input = await within(dialog).findByLabelText(bn['profile.nameLabel'])
  await user.type(input, 'a')
  await user.click(within(dialog).getByRole('button', { name: bn['profile.save'] }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent(bn['profile.name_length'])
  await user.clear(input)
  await user.type(input, 'hi <b>')
  await user.click(within(dialog).getByRole('button', { name: bn['profile.save'] }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent(bn['profile.name_chars'])
  await user.clear(input)
  await user.click(within(dialog).getByRole('checkbox'))
  await user.click(within(dialog).getByRole('button', { name: bn['profile.save'] }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent(bn['profile.name_required'])
  expect(client.rpc).not.toHaveBeenCalledWith('set_my_profile', expect.anything())
})

test('a name the server refuses shows the reason and the form stays editable', async () => {
  const client = account({ rpcResult: async () => ({ data: null, error: { message: 'name_blocked' } }) })
  const { user, dialog } = await open(client)
  await user.type(await within(dialog).findByLabelText(bn['profile.nameLabel']), 'Somename')
  await user.click(within(dialog).getByRole('button', { name: bn['profile.save'] }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(bn['profile.name_blocked'])
  expect(within(dialog).getByRole('button', { name: bn['profile.save'] })).toBeEnabled()
})
