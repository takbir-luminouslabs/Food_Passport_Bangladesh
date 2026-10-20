import { mkdirSync, writeFileSync } from 'node:fs'
import { GlobalFonts, createCanvas } from '@napi-rs/canvas'
import { realContent } from '../test/fixtures'
import { CARD_HEIGHT, CARD_WIDTH, FONT_STACK, buildCardModel, drawShareCard } from './shareCard'
import { computeProgress } from './scoring'
import { createInitialState, markTried } from './state'

const FONT_DIR = 'node_modules/@fontsource-variable/noto-sans-bengali/files'
// In a browser the @font-face unicode-range subsets combine into one family. Node's canvas cannot do that,
// so register each subset as its own family and fall back across them per glyph.
const SUBSETS = ['bengali', 'latin', 'latin-ext']
for (const subset of SUBSETS) {
  GlobalFonts.registerFromPath(`${FONT_DIR}/noto-sans-bengali-${subset}-wght-normal.woff2`, `NSB ${subset}`)
}
const TEST_STACK = SUBSETS.map((s) => `"NSB ${s}"`).join(', ')

/** Wrap a node-canvas context so the production font stack maps onto the test families. */
const withTestFonts = (raw) =>
  new Proxy(raw, {
    get: (t, k) => (typeof t[k] === 'function' ? t[k].bind(t) : t[k]),
    set: (t, k, v) => {
      t[k] = k === 'font' ? String(v).replace(FONT_STACK, TEST_STACK) : v
      return true
    },
  })

const content = realContent()
const ids = ['chotpoti', 'natore-kacha-gola', 'cumilla-roshmalai', 'haleem', 'bakarkhani', 'bogura-doi', 'porabari-chomchom', 'seven-layer-tea', 'haji-biryani']

function render(lang, displayName) {
  const state = { ...ids.reduce(markTried, createInitialState(lang)) }
  const progress = computeProgress(state, content)
  const model = buildCardModel({ state, progress, content, lang, displayName })
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT)
  drawShareCard(withTestFonts(canvas.getContext('2d')), model, [])
  return canvas.toBuffer('image/png')
}

const out = process.env.SHARE_CARD_PREVIEW_DIR
const save = (name, buf) => {
  if (out) {
    mkdirSync(out, { recursive: true })
    writeFileSync(`${out}/${name}`, buf)
  }
}

test('Bengali card exports a valid, full-size PNG', () => {
  const png = render('bn', 'রাফি আহমেদ')
  save('card-bn.png', png)
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  expect(png.readUInt32BE(16)).toBe(CARD_WIDTH)
  expect(png.readUInt32BE(20)).toBe(CARD_HEIGHT)
  expect(png.length).toBeGreaterThan(30_000)
})

test('English card exports a valid PNG that differs from the Bengali one', () => {
  const en = render('en', 'Rafi')
  save('card-en.png', en)
  expect([...en.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  expect(en.equals(render('bn', 'রাফি'))).toBe(false)
})

test('an empty passport still renders', () => {
  const state = createInitialState('bn')
  const model = buildCardModel({ state, progress: computeProgress(state, content), content, lang: 'bn' })
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT)
  drawShareCard(withTestFonts(canvas.getContext('2d')), model, [])
  const png = canvas.toBuffer('image/png')
  save('card-empty-bn.png', png)
  expect(png.length).toBeGreaterThan(10_000)
})
