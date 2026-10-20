import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { INKS, stampStyle } from '../utils/passportStyle'
import { iconSvgPath } from '../utils/stampIcons'

const bn = translations.bn
const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const book = () => screen.getByRole('group', { name: bn['book.label'] })
const stamp = (id) => document.querySelector(`[data-food-id="${id}"]`)
const tried = { state: { triedFoodIds: ['dinajpur-katarivog', 'natore-kacha-gola'] } }

test('a collected stamp is a round seal in its own deterministic ink', async () => {
  await renderApp('#/passport', tried)
  for (const id of ['dinajpur-katarivog']) {
    const seal = stamp(id).querySelector('svg')
    expect(seal).toHaveAttribute('aria-hidden', 'true')
    expect(seal.getAttribute('data-ink')).toBe(INKS[stampStyle(id).ink])
    expect(stamp(id).dataset.shape).toBe('round')
  }
})

test('the seal carries the food name, the district and the food photo, written on the ring', async () => {
  await renderApp('#/passport', tried)
  const seal = stamp('dinajpur-katarivog').querySelector('svg')
  const food = foods.find((f) => f.id === 'dinajpur-katarivog')
  expect(seal.querySelectorAll('textPath')).toHaveLength(2)
  expect(seal).toHaveTextContent(food.name_bn)
  expect(seal).toHaveTextContent(food.region.district_bn)
  expect(seal.querySelector('image')).toHaveAttribute('href', food.image_url)
  expect([...seal.querySelectorAll('path')].map((p) => p.getAttribute('d'))).not.toContain(iconSvgPath('rice_biryani'))
})

test('the seal text is large enough to read: no tiny print', async () => {
  await renderApp('#/passport', tried)
  for (const text of stamp('dinajpur-katarivog').querySelectorAll('svg text')) {
    expect(Number(text.getAttribute('font-size'))).toBeGreaterThanOrEqual(10)
  }
})

test('assistive technology gets the name, district and state instead of the drawn text', async () => {
  await renderApp('#/passport', tried)
  expect(stamp('dinajpur-katarivog')).toHaveAccessibleName(new RegExp('কাটারিভোগ চাল.*দিনাজপুর.*' + bn['stamp.collected']))
})

test('a locked stamp stays a plain empty slot with the line-art lock', async () => {
  const { user } = await renderApp('#/passport', tried)
  await user.click(screen.getByRole('button', { name: bn['book.next'] }))
  const locked = within(book()).getAllByText(bn['stamp.locked'])[0].closest('a')
  expect(locked.dataset.shape).toBeUndefined()
  const lock = locked.querySelector('svg')
  expect(lock).toHaveAttribute('aria-hidden', 'true')
  expect(lock.querySelector('path').getAttribute('d')).toBe(iconSvgPath('lock'))
})

test('every locked stamp shows the district its food belongs to', async () => {
  const { user } = await renderApp('#/passport', tried)
  await user.click(screen.getByRole('button', { name: bn['book.next'] }))
  const locked = within(book()).getAllByText(bn['stamp.locked'])[0].closest('a')
  const food = foods.find((f) => f.id === locked.dataset.foodId)
  expect(locked).toHaveTextContent(food.region.district_bn)
})
