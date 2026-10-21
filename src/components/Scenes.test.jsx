import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { HillsScene } from './Scenes'

test.each([['hills', HillsScene]])('the %s illustration is decorative: hidden from assistive tech, no text, not focusable', (name, Scene) => {
  const { container } = render(<Scene />)
  const svg = container.querySelector('svg')
  expect(svg).toHaveAttribute('data-scene', name)
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('focusable', 'false')
  expect(svg.querySelector('text')).toBeNull()
  expect(svg.querySelector('a, button')).toBeNull()
})

test('the scene animations stop for people who prefer reduced motion', () => {
  const css = readFileSync('src/index.css', 'utf8')
  const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
  expect(reduced).toMatch(/animation:\s*none|animation-duration:\s*0\.01ms/)
})

test('the scene animations stop for people who prefer reduced motion', () => {
  const css = readFileSync('src/index.css', 'utf8')
  const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
  expect(reduced).toMatch(/animation:\s*none|animation-duration:\s*0\.01ms/)
})

