import { readFileSync } from 'node:fs'
import { screen } from '@testing-library/react'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { INKS, STAMP_SHAPES, stampStyle } from '../utils/passportStyle'
import { iconSvgPath } from '../utils/stampIcons'

const bn = translations.bn
const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))

test('a collected stamp gets its own deterministic shape and ink', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti', 'haleem'] } })
  const stamps = screen.getAllByText(bn['stamp.collected']).map((el) => el.closest('a'))
  expect(stamps).toHaveLength(2)
  for (const link of stamps) {
    const id = link.getAttribute('href').split('/').pop()
    const style = stampStyle(id)
    expect(STAMP_SHAPES).toContain(link.dataset.shape)
    expect(link.dataset.shape).toBe(style.shape)
    expect(link.style.getPropertyValue('--stamp-ink')).toBe(INKS[style.ink])
  }
})

test('a locked stamp stays a plain empty slot', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti'] } })
  const locked = screen.getAllByText(bn['stamp.locked'])[0].closest('a')
  expect(locked.dataset.shape).toBeUndefined()
  expect(locked.style.getPropertyValue('--stamp-ink')).toBe('')
})

test('a collected stamp shows the category line-art icon and a tick, a locked one shows the line-art lock', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti'] } })
  const collected = screen.getAllByText(bn['stamp.collected'])[0].closest('a')
  const paths = [...collected.querySelectorAll('svg')].map((s) => s.querySelector('path').getAttribute('d'))
  expect(paths).toEqual([iconSvgPath('street_food'), iconSvgPath('check')])
  for (const svg of collected.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true')
  const locked = screen.getAllByText(bn['stamp.locked'])[0].closest('a')
  const lock = locked.querySelector('svg')
  expect(lock).toHaveAttribute('aria-hidden', 'true')
  expect(lock.querySelector('path').getAttribute('d')).toBe(iconSvgPath('lock'))
})

test('every stamp shows the district its food belongs to, collected or still locked', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti'] } })
  const collected = screen.getAllByText(bn['stamp.collected'])[0].closest('a')
  expect(collected).toHaveTextContent('ঢাকা')
  const locked = screen.getAllByText(bn['stamp.locked'])[0].closest('a')
  expect(locked.textContent).toMatch(/[ঀ-৿]+/)
  const id = locked.getAttribute('href').split('/').pop()
  const food = foods.find((f) => f.id === id)
  expect(locked).toHaveTextContent(food.region.district_bn)
})
