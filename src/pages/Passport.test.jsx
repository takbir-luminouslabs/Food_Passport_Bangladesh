import { readFileSync } from 'node:fs'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { exportState } from '../utils/storage'
import { createInitialState, markTried } from '../utils/state'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const categories = JSON.parse(readFileSync('public/data/categories.json', 'utf8'))
const street = foods.filter((f) => f.category === 'rice_biryani').map((f) => f.id)
const rice = foods.filter((f) => f.category === 'rice_biryani').map((f) => f.id)
const pitha = foods.filter((f) => f.category === 'pitha_snacks').map((f) => f.id)
const bnNum = (n) => new Intl.NumberFormat('bn-BD').format(n)
const bn = translations.bn
afterEach(() => vi.unstubAllGlobals())

const collection = (name) => screen.getByRole('region', { name })

test('every collection can be reached from the book and every food has a stamp', async () => {
  const { user } = await renderApp('#/passport')
  const jump = screen.getByRole('navigation', { name: bn['book.jump'] })
  const names = within(jump).getAllByRole('button').map((b) => b.textContent)
  expect(names).toEqual(categories.filter((c) => foods.some((f) => f.category === c.id)).map((c) => c.name_bn))
  for (const c of categories.filter((x) => foods.some((f) => f.category === x.id))) {
    await user.click(within(jump).getByRole('button', { name: c.name_bn }))
    expect(screen.getAllByRole('region', { name: new RegExp(`^${c.name_bn}`) }).length).toBeGreaterThan(0)
  }
})

test('locked and collected stamps differ by text label and icon, not only colour', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: rice.slice(0, 1) } })
  const region = collection('ভাত ও বিরিয়ানি')
  expect(within(region).getAllByText(new RegExp(`${bn['stamp.collected']}$`))).toHaveLength(1)
  expect(within(region).getAllByText(bn['stamp.locked'])).toHaveLength(rice.length - 1)
  expect(within(region).getByText(/১\/৩/)).toBeInTheDocument()
})

test('summary and collection completion', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: street } })
  expect(screen.getByText(bn['passport.summary'].replace('{total}', '৬৪').replace('{tried}', bnNum(street.length)))).toBeInTheDocument()
  expect(within(collection('ভাত ও বিরিয়ানি')).getByText(bn['passport.collectionComplete'])).toBeInTheDocument()
  const bar = within(collection('ভাত ও বিরিয়ানি')).getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '100')
})

test('badges show earned and locked states with unlock conditions', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: pitha.slice(0, 1) } })
  const badges = screen.getByRole('region', { name: bn['home.badges'] })
  const first = within(badges).getByRole('listitem', { name: /প্রথম কামড়/ })
  expect(within(first).getByText(bn['badge.earned'])).toBeInTheDocument()
  const lover = within(badges).getByRole('listitem', { name: /পিঠা-প্রেমী/ })
  expect(within(lover).getByText(bn['badge.locked'])).toBeInTheDocument()
  expect(within(lover).getByText('২টি পিঠা চেখে দেখুন।')).toBeInTheDocument()
})

describe('your data', () => {
  test('reset needs confirmation', async () => {
    const { user } = await renderApp('#/passport', { state: { triedFoodIds: pitha } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: bn['passport.reset'] }))
    expect(confirm).toHaveBeenCalledWith(bn['passport.resetConfirm'])
    expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toHaveLength(pitha.length)

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: bn['passport.reset'] }))
    expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toEqual([])
    confirm.mockRestore()
  })

  test('exports a backup file', async () => {
    const { user } = await renderApp('#/passport', { state: { triedFoodIds: ['dinajpur-katarivog'] } })
    const create = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
    await user.click(screen.getByRole('button', { name: bn['backup.export'] }))
    expect(create).toHaveBeenCalledTimes(1)
    const blob = create.mock.calls[0][0]
    expect(JSON.parse(await blob.text()).data.triedFoodIds).toEqual(['dinajpur-katarivog'])
  })

  test('restores a valid backup and rejects an invalid one', async () => {
    const { user } = await renderApp('#/passport')
    const input = screen.getByLabelText(bn['backup.import'])
    const good = new File([exportState(markTried(createInitialState(), 'dinajpur-katarivog'))], 'b.json', { type: 'application/json' })
    await user.upload(input, good)
    expect(await screen.findByText(bn['backup.importOk'])).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toEqual(['dinajpur-katarivog']))

    await user.upload(input, new File(['nope'], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByText(bn['backup.importFailed'])).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('food-passport-bangladesh:v1')).triedFoodIds).toEqual(['dinajpur-katarivog'])
  })
})
