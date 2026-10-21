import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '../App'
import { translations } from '../data/translations'
import { okFetch } from '../test/renderApp'
import { createInitialState } from '../utils/state'
import { STORAGE_KEY } from '../utils/storage'

const bn = translations.bn
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k])

/** A stand-in for the account: remembers stamps and right answers, and behaves like merge_guest_progress. */
function fakeAccount({ foods = [], quiz = [], fail = false } = {}) {
  const db = { foods: new Set(foods), quiz: new Set(quiz), merges: [], removed: [] }
  const rows = (list, key) => ({ data: [...list].map((v) => ({ [key]: v })), error: null })
  return {
    db,
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u1', email: 'rafi@example.com' } } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: (table) => ({
      select: () => {
        if (fail) return Object.assign(Promise.resolve({ data: null, error: new Error('down') }), { eq: async () => ({ data: null, error: new Error('down') }) })
        return Object.assign(Promise.resolve(rows(db.foods, 'food_id')), { eq: async () => rows(db.quiz, 'reference_id') })
      },
      table,
    }),
    rpc: vi.fn(async (name, args) => {
      if (name === 'merge_guest_progress') {
        const nf = args.p_foods.filter((f) => !db.foods.has(f))
        const nq = args.p_quiz.filter((q) => !db.quiz.has(q))
        args.p_foods.forEach((f) => db.foods.add(f))
        args.p_quiz.forEach((q) => db.quiz.add(q))
        db.merges.push(args)
        return { data: { new_stamps: nf.length, new_quiz: nq.length, xp_awarded: nf.length * 10 + nq.length * 5 }, error: null }
      }
      if (name === 'unmark_food_tried') {
        db.foods.delete(args.p_food_id)
        db.removed.push(args.p_food_id)
        return { data: { removed: true }, error: null }
      }
      return { data: null, error: null }
    }),
  }
}

const seedLocal = (foods, quiz = []) => {
  const s = createInitialState('bn')
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, triedFoodIds: foods, quizProgress: { correctIds: quiz } }))
}
const localState = () => JSON.parse(localStorage.getItem(STORAGE_KEY))

async function start(account) {
  window.location.hash = '#/'
  vi.stubGlobal('fetch', vi.fn(okFetch))
  const user = userEvent.setup()
  render(<App authClient={account} />)
  await screen.findByRole('heading', { level: 1 })
  return { user }
}

beforeEach(() => localStorage.clear())

test('guest stamps are offered to the account first; merging adds only what is new and reports it', async () => {
  seedLocal(['bakarkhani', 'ilish-bhaja'], ['q1'])
  const account = fakeAccount({ foods: ['bakarkhani'] }) // one overlaps, one already online-only
  account.db.foods.add('mishti-doi')
  const { user } = await start(account)

  const dialog = await screen.findByRole('dialog', { name: bn['sync.askTitle'] })
  expect(within(dialog).getByText(fmt(bn['sync.askBody'], { stamps: 1, answers: 1 }))).toBeInTheDocument()
  expect(within(dialog).getByText(fmt(bn['sync.askAlso'], { n: 1 }))).toBeInTheDocument()
  expect(account.rpc).not.toHaveBeenCalled() // nothing moves before the user agrees

  await user.click(within(dialog).getByRole('button', { name: bn['sync.merge'] }))
  expect(await screen.findByText(new RegExp(fmt(bn['sync.doneStamps'], { n: 1 })))).toBeInTheDocument()
  expect(account.db.merges).toEqual([{ p_foods: ['ilish-bhaja'], p_quiz: ['q1'] }])
  expect([...account.db.foods].sort()).toEqual(['bakarkhani', 'ilish-bhaja', 'mishti-doi'])
  expect([...localState().triedFoodIds].sort()).toEqual(['bakarkhani', 'ilish-bhaja', 'mishti-doi'])
  expect(localState().quizProgress.correctIds).toEqual(['q1'])
})

test('"Not now" changes nothing on either side', async () => {
  seedLocal(['bakarkhani'])
  const account = fakeAccount({ foods: ['mishti-doi'] })
  const { user } = await start(account)
  const dialog = await screen.findByRole('dialog', { name: bn['sync.askTitle'] })
  await user.click(within(dialog).getByRole('button', { name: bn['sync.later'] }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(account.rpc).not.toHaveBeenCalled()
  expect(localState().triedFoodIds).toEqual(['bakarkhani'])
  expect([...account.db.foods]).toEqual(['mishti-doi'])
})

test('an empty browser just receives the account progress, with no question asked', async () => {
  seedLocal([])
  const account = fakeAccount({ foods: ['mishti-doi', 'bakarkhani'], quiz: ['q9'] })
  await start(account)
  await waitFor(() => expect([...localState().triedFoodIds].sort()).toEqual(['bakarkhani', 'mishti-doi']))
  expect(localState().quizProgress.correctIds).toEqual(['q9'])
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(account.rpc).not.toHaveBeenCalled()
})

test('merging again (a second sign-in) finds nothing to add and never asks twice', async () => {
  seedLocal(['bakarkhani'])
  const account = fakeAccount()
  const first = await start(account)
  await first.user.click(await screen.findByRole('button', { name: bn['sync.merge'] }))
  await screen.findByText(bn['sync.doneTitle'])
  expect(account.db.merges).toHaveLength(1)
  cleanup() // a new page load: same storage, same account
  const second = await start(account)
  await new Promise((r) => setTimeout(r, 50))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(account.db.merges).toHaveLength(1)
  expect(second).toBeTruthy()
})

test('after the first sync, ticking and un-ticking a food reaches the account', async () => {
  seedLocal([])
  const account = fakeAccount()
  const { user } = await start(account)
  await waitFor(() => expect(account.auth.getSession).toHaveBeenCalled())
  await user.click(await screen.findByRole('button', { name: new RegExp(bn['cta.start']) }))
  const btn = (await screen.findAllByRole('button', { name: new RegExp(`^${bn['food.markTried']}`) }))[0]
  await user.click(btn)
  await waitFor(() => expect(account.db.foods.size).toBe(1))
  const [id] = [...account.db.foods]
  expect(account.db.merges.at(-1).p_foods).toEqual([id])
  await user.click(screen.getAllByRole('button', { name: new RegExp(`^${bn['food.tried']}`) })[0])
  await waitFor(() => expect(account.db.removed).toEqual([id]))
  expect(account.db.foods.size).toBe(0)
})

test('if the account cannot be reached the guest passport is left alone and a message explains', async () => {
  seedLocal(['bakarkhani'])
  const account = fakeAccount({ fail: true })
  await start(account)
  expect(await screen.findByRole('dialog', { name: bn['sync.askTitle'] })).toBeInTheDocument()
  expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(bn["sync.errorBody"])
  expect(localState().triedFoodIds).toEqual(['bakarkhani'])
})
