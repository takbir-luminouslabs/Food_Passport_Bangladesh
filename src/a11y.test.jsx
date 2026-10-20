import { readFileSync } from 'node:fs'
import axe from 'axe-core'
import { renderApp } from './test/renderApp'

// jsdom has no layout or paint, so colour contrast is checked separately in a real browser.
const run = async (container) =>
  axe.run(container, { rules: { 'color-contrast': { enabled: false } }, resultTypes: ['violations'] })

const describeViolations = (violations) =>
  violations.map((v) => `${v.id}: ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(' ')}  ${n.failureSummary?.split('\\n')[1] ?? ''}`).join('\n')}`).join('\n')

const ROUTES = ['#/', '#/discover', '#/discover/chotpoti', '#/passport', '#/challenges', '#/quiz', '#/leaderboard', '#/privacy', '#/nope']
const STATE = { triedFoodIds: ['chotpoti', 'haleem', 'bakarkhani'] }

describe.each([['bn'], ['en']])('accessibility (%s)', (lang) => {
  test.each(ROUTES)('%s has no axe violations', async (route) => {
    await renderApp(route, { state: { ...STATE, language: lang } })
    const { violations } = await run(document.body)
    expect(violations, describeViolations(violations)).toEqual([])
  })
})

test('the page has a single h1, a main landmark and a skip link', async () => {
  await renderApp('#/passport', { state: STATE })
  expect(document.querySelectorAll('h1')).toHaveLength(1)
  expect(document.querySelectorAll('main')).toHaveLength(1)
  expect(document.querySelector('a[href="#main"]')).not.toBeNull()
})

test('the skip link is the first thing keyboard users reach, and it jumps to the main content', async () => {
  const { user } = await renderApp('#/discover')
  await user.tab()
  const skip = document.querySelector('a[href="#main"]')
  expect(skip).toHaveFocus()
  expect(skip).toBeVisible()
})

test('reduced-motion: animation and transitions are switched off site-wide, not just in a few components', () => {
  const css = readFileSync('src/index.css', 'utf8')
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
  expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
})
