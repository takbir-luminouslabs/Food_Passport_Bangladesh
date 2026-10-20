import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { FoodFloaters, HeroScene, HillsScene } from './Scenes'

test.each([['hero', HeroScene], ['hills', HillsScene]])('the %s illustration is decorative: hidden from assistive tech, no text, not focusable', (name, Scene) => {
  const { container } = render(<Scene />)
  const svg = container.querySelector('svg')
  expect(svg).toHaveAttribute('data-scene', name)
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('focusable', 'false')
  expect(svg.querySelector('text')).toBeNull()
  expect(svg.querySelector('a, button')).toBeNull()
})

test('the hero has a sun, drifting clouds and a bobbing boat', () => {
  const { container } = render(<HeroScene />)
  expect(container.querySelectorAll('.scene-drift').length).toBeGreaterThanOrEqual(2)
  expect(container.querySelectorAll('.scene-bob').length).toBeGreaterThanOrEqual(1)
  expect(container.querySelector('[data-part="sun"]')).not.toBeNull()
})

test('the scene animations stop for people who prefer reduced motion', () => {
  const css = readFileSync('src/index.css', 'utf8')
  const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
  expect(reduced).toMatch(/animation:\s*none|animation-duration:\s*0\.01ms/)
})

test('the skyline has a street-food cart with a steaming kettle', () => {
  const { container } = render(<HeroScene />)
  expect(container.querySelector('[data-part="cart"]')).not.toBeNull()
  expect(container.querySelectorAll('.scene-steam').length).toBeGreaterThanOrEqual(2)
})

describe('FoodFloaters', () => {
  test('a ring of floating dishes: decorative, with several different dishes', () => {
    const { container } = render(<FoodFloaters />)
    const root = container.firstElementChild
    expect(root).toHaveAttribute('aria-hidden', 'true')
    const dishes = root.querySelectorAll('[data-dish]')
    expect(dishes.length).toBeGreaterThanOrEqual(6)
    expect(new Set([...dishes].map((d) => d.dataset.dish)).size).toBe(dishes.length)
    for (const d of dishes) expect(d.getAttribute("class")).toMatch(/scene-float/)
    expect(root.querySelector('text')).toBeNull()
  })
})
