import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '../App'
import { translations } from '../data/translations'
import { okFetch } from '../test/renderApp'
import { createInitialState } from '../utils/state'
import { STORAGE_KEY } from '../utils/storage'

const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k])

function account({ foods = [], quiz = [], failRead = false } = {}) {
  const db = { foods: new Set(foods), quiz: new Set(quiz), merges: [], removed: [] }
  let listener
  const rows = (list, key) => ({ data: [...list].map((v) => ({ [key]: v })), error: null })
  return {
    db,
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u1', email: 'rafi@example.com' } } } })),
      onAuthStateChange: vi.fn((cb) => { listener = cb; return { data: { subscription: { unsubscribe: vi.fn() } } } }),
      signOut: vi.fn(async () => { listener?.('SIGNED_OUT', null); return { error: null } }),
    },
    from: () => ({
      select: () => {
        if (failRead) return Object.assign(Promise.resolve({ data: null, error: new Error('down') }), { eq: async () => ({ data: null, error: new Error('down') }), maybeSingle: async () => ({ data: null, error: null }) })
        return Object.assign(Promise.resolve(rows(db.foods, 'food_id')), { eq: async () => rows(db.quiz, 'reference_id'), maybeSingle: async () => ({ data: null, error: null }) })
      },
    }),
    rpc: vi.fn(async (name, args) => {
      if (name === 'merge_guest_progress') { args.p_foods.forEach((f) => db.foods.add(f)); args.p_quiz.forEach((q) => db.quiz.add(q)); db.merges.push(args) }
      if (name === 'unmark_food_tried') db.removed.push(args.p_food_id)
      return { data: { new_stamps: 0, new_quiz: 0, xp_awarded: 0 }, error: null }
    }),
  }
}

const local = () => JSON.parse(localStorage.getItem(STORAGE_KEY))

async function openSignOut(c, foods, quiz = []) {
  localStorage.clear()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...createInitialState('en'), triedFoodIds: foods, quizProgress: { correctIds: quiz } }))
  window.location.hash = '#/'
  vi.stubGlobal('fetch', vi.fn(okFetch))
  const user = userEvent.setup()
  render(<App authClient={c} />)
  await screen.findByRole('heading', { level: 1 })
  await within(screen.getByRole('banner')).findByRole('button', { name: translations.en['auth.account'] })
  return { user }
}
// close whatever sync dialog is showing (Escape = "Not now"), then open the Account window
async function openAccount(user) {
  await new Promise((r) => setTimeout(r, 60))
  if (screen.queryByRole('dialog')) await user.keyboard('{Escape}')
  await user.click(within(screen.getByRole('banner')).getByRole('button', { name: translations.en['auth.account'] }))
}
const en = translations.en
const clickIn = async (user, name) => user.click(await within(screen.getByRole('dialog')).findByRole('button', { name }))

test('signing out clears this browser (keeps the language), the account keeps everything, and nothing is un-ticked online', async () => {
  const c = account({ foods: ['bakarkhani', 'gazipur-kathal'] })
  const { user } = await openSignOut(c, ['bakarkhani', 'gazipur-kathal'])
  await openAccount(user)
  await clickIn(user, en['auth.signOut'])
  expect(await screen.findByText(en['auth.signOutBody'])).toBeInTheDocument()
  expect(local().triedFoodIds).toHaveLength(2) // nothing happens until confirmed
  await clickIn(user, en['auth.signOut'])
  await waitFor(() => expect(local().triedFoodIds).toEqual([]))
  expect(local().language).toBe('en')
  expect(c.auth.signOut).toHaveBeenCalled()
  expect(c.db.removed).toEqual([])
  expect([...c.db.foods].sort()).toEqual(['bakarkhani', 'gazipur-kathal'])
})

test('if this browser holds progress the account lacks, the person is warned and can add it first', async () => {
  const c = account({ foods: ['bakarkhani'] })
  const { user } = await openSignOut(c, ['bakarkhani', 'gazipur-kathal'], ['q1'])
  await openAccount(user)
  await clickIn(user, en['auth.signOut'])
  expect(await screen.findByText(fmt(en['auth.signOutUnsynced'], { stamps: 1, answers: 1 }))).toBeInTheDocument()
  await clickIn(user, en['auth.signOutAdd'])
  await waitFor(() => expect(local().triedFoodIds).toEqual([]))
  expect(c.db.merges).toEqual([{ p_foods: ['gazipur-kathal'], p_quiz: ['q1'] }])
  expect(c.db.removed).toEqual([])
})

test('"sign out anyway" clears without adding, and Cancel changes nothing', async () => {
  const c = account({ foods: [] })
  const { user } = await openSignOut(c, ['bakarkhani'])
  await openAccount(user)
  await clickIn(user, en['auth.signOut'])
  await clickIn(user, en['auth.cancel'])
  expect(c.auth.signOut).not.toHaveBeenCalled()
  expect(local().triedFoodIds).toEqual(['bakarkhani'])
  await clickIn(user, en['auth.signOut'])
  await clickIn(user, en['auth.signOutAnyway'])
  await waitFor(() => expect(local().triedFoodIds).toEqual([]))
  expect(c.db.merges).toEqual([])
})

test('if the account cannot be checked, the warning says so before anything is cleared', async () => {
  const c = account({ failRead: true })
  const { user } = await openSignOut(c, ['bakarkhani'])
  await openAccount(user)
  await clickIn(user, en['auth.signOut'])
  expect(await screen.findByText(en['auth.signOutUnknown'])).toBeInTheDocument()
  expect(local().triedFoodIds).toEqual(['bakarkhani'])
})
