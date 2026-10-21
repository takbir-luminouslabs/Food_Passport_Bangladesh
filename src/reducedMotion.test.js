import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

test('the animations stop for people who prefer reduced motion', () => {
  const css = readFileSync('src/index.css', 'utf8')
  const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
  expect(reduced).toMatch(/animation:\s*none|animation-duration:\s*0\.01ms/)
})
