import { createRecordingCtx } from '../test/recordingCtx'
import { CATEGORY_IDS, UI_ICON_IDS, iconSvgPath, paintIcon } from './stampIcons'

const CATEGORIES = ['street_food', 'rice_biryani', 'fish_seafood', 'meat_savoury', 'sweets_desserts', 'pitha_snacks', 'breakfast_everyday', 'drinks', 'regional_specialties']

test('every food category has its own line-art icon', () => {
  expect([...CATEGORY_IDS].sort()).toEqual([...CATEGORIES].sort())
  expect(new Set(CATEGORIES.map(iconSvgPath)).size).toBe(CATEGORIES.length)
})

test('an unknown category still gets a generic icon', () => {
  expect(iconSvgPath('nope')).toMatch(/^M/)
  const ctx = createRecordingCtx()
  expect(() => paintIcon(ctx, 'nope', 0, 0, 60, '#174B32')).not.toThrow()
  expect(ctx.calls.some((c) => c[0] === 'stroke')).toBe(true)
})

test('the svg path is valid-looking path data in a 100x100 box', () => {
  for (const id of CATEGORIES) {
    const d = iconSvgPath(id)
    expect(d).toMatch(/^M[-\d. MLQCAZ,]+$/)
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number)
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(-1)
    expect(Math.max(...nums)).toBeLessThanOrEqual(101)
  }
})

test('paintIcon strokes in the given colour, scaled to the requested size, without emoji text', () => {
  for (const id of CATEGORIES) {
    const ctx = createRecordingCtx()
    const seen = []
    Object.defineProperty(ctx, 'strokeStyle', { set(v) { seen.push(v) }, get: () => '' })
    paintIcon(ctx, id, 10, 20, 60, '#A12B2B')
    expect(seen).toContain('#A12B2B')
    expect(ctx.calls.filter((c) => c[0] === 'stroke').length).toBeGreaterThan(0)
    expect(ctx.texts()).toHaveLength(0)
    expect(ctx.calls.find((c) => c[0] === 'translate')).toEqual(['translate', 10 - 30, 20 - 30])
    expect(ctx.calls.find((c) => c[0] === 'scale')).toEqual(['scale', 0.6, 0.6])
  }
})

const UI = ['home', 'search', 'book', 'trophy', 'help', 'chart', 'lock', 'check', 'close', 'arrowLeft', 'arrowRight', 'pin', 'medal', 'expand', 'chefHat', 'compass', 'leaf', 'user', 'utensils', 'stampTool']

describe('interface icons (same line-art style as the stamps)', () => {
  test('there is one icon for every glyph the site used to draw with emoji or text symbols', () => {
    expect([...UI_ICON_IDS].sort()).toEqual([...UI].sort())
  })
  test('each has its own shape, valid path data and stays inside the 100x100 box', () => {
    expect(new Set(UI.map(iconSvgPath)).size).toBe(UI.length)
    for (const id of UI) {
      const d = iconSvgPath(id)
      expect(d, id).toMatch(/^M[-\d. MLQCAZ,]+$/)
      const nums = d.match(/-?\d+(\.\d+)?/g).map(Number)
      expect(Math.min(...nums), id).toBeGreaterThanOrEqual(-1)
      expect(Math.max(...nums), id).toBeLessThanOrEqual(101)
    }
  })
  test('they can be painted on a canvas too (share card and PDF) without emoji text', () => {
    for (const id of UI) {
      const ctx = createRecordingCtx()
      paintIcon(ctx, id, 0, 0, 40, '#174B32')
      expect(ctx.calls.some((c) => c[0] === 'stroke'), id).toBe(true)
      expect(ctx.texts()).toHaveLength(0)
    }
  })
  test('category icons and interface icons never share an id', () => {
    expect(CATEGORY_IDS.filter((id) => UI_ICON_IDS.includes(id))).toEqual([])
  })
})
