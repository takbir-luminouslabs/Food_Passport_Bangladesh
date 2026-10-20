import { readFileSync } from 'node:fs'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { exportState } from '../utils/storage'
import { createInitialState, markTried } from '../utils/state'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const categories = JSON.parse(readFileSync('public/data/categories.json', 'utf8'))
const street = foods.filter((f) => f.category === 'street_food').map((f) => f.id)
const bn = translations.bn
afterEach(() => vi.unstubAllGlobals())

const collection = (name) => screen.getByRole('region', { name })

test('every collection can be reached from the book and every food has a stamp', async () => {
  const { user } = await renderApp('#/passport')
  const jump = screen.getByRole('navigation', { name: bn['book.jump'] })
  const names = within(jump).getAllByRole('button').map((b) => b.textContent)
  expect(names).toEqual(categories.map((c) => c.name_bn))
  for (const c of categories) {
    await user.click(within(jump).getByRole('button', { name: c.name_bn }))
    expect(screen.getAllByRole('region', { name: new RegExp(`^${c.name_bn}`) }).length).toBeGreaterThan(0)
  }
})

test('locked and collected stamps differ by text label and icon, not only colour', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: street.slice(0, 1) } })
  const region = collection('স্ট্রিট ফুড')
  expect(within(region).getAllByText(bn['stamp.collected'])).toHaveLength(1)
  expect(within(region).getAllByText(bn['stamp.locked'])).toHaveLength(street.length - 1)
  expect(within(region).getByText(/১\/২/)).toBeInTheDocument()
})

test('summary and collection completion', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: street } })
  expect(screen.getByText(bn['passport.summary'].replace('{total}', '৭১').replace('{tried}', '২'))).toBeInTheDocument()
  expect(within(collection('স্ট্রিট ফুড')).getByText(bn['passport.collectionComplete'])).toBeInTheDocument()
  const bar = within(collection('স্ট্রিট ফুড')).getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '100')
})

test('badges show earned and locked states with unlock conditions', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: street.slice(0, 1) } })
  const badges = screen.getByRole('region', { name: bn['passport.badges'] })
  const first = within(badges).getByRole('listitem', { name: /প্রথম কামড়/ })
  expect(within(first).getByText(bn['badge.earned'])).toBeInTheDocument()
  const fan = within(badges).getByRole('listitem', { name: /স্ট্রিট ফুড ফ্যান/ })
  expect(within(fan).getByText(bn['badge.locked'])).toBeInTheDocument()
  expect(within(fan).getByText('২টি স্ট্রিট ফুড চেখে দেখুন।')).toBeInTheDocument()
})

describe('your data', () => {
  test('reset needs confirmation', async () => {
    const { user } = await renderApp('#/passport', { state: { triedFoodIds: street } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: bn['passport.reset'] }))
    expect(confirm).toHaveBeenCalledWith(bn['passport.resetConfirm'])
    expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toHaveLength(2)

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: bn['passport.reset'] }))
    expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toEqual([])
    confirm.mockRestore()
  })

  test('exports a backup file', async () => {
    const { user } = await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti'] } })
    const create = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
    await user.click(screen.getByRole('button', { name: bn['backup.export'] }))
    expect(create).toHaveBeenCalledTimes(1)
    const blob = create.mock.calls[0][0]
    expect(JSON.parse(await blob.text()).data.triedFoodIds).toEqual(['chotpoti'])
  })

  test('restores a valid backup and rejects an invalid one', async () => {
    const { user } = await renderApp('#/passport')
    const input = screen.getByLabelText(bn['backup.import'])
    const good = new File([exportState(markTried(createInitialState(), 'chotpoti'))], 'b.json', { type: 'application/json' })
    await user.upload(input, good)
    expect(await screen.findByText(bn['backup.importOk'])).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toEqual(['chotpoti']))

    await user.upload(input, new File(['nope'], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByText(bn['backup.importFailed'])).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toEqual(['chotpoti'])
  })
})
