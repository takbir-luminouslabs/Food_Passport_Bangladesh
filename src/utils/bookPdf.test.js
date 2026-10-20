import { readFileSync } from 'node:fs'
import { createRecordingCtx } from '../test/recordingCtx'
import { buildBookModel } from './bookModel'
import { drawBookSheet, renderBook } from './bookPdf'
import { computeProgress } from './scoring'
import { createInitialState, markTried } from './state'

const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const categories = JSON.parse(readFileSync('public/data/categories.json', 'utf8'))
const challenges = JSON.parse(readFileSync('public/data/challenges.json', 'utf8'))
const badges = JSON.parse(readFileSync('public/data/badges.json', 'utf8'))
const content = { foods, categories, challenges, badges }
const model = (ids = ['dinajpur-katarivog', 'natore-kacha-gola'], opts = {}) => {
  const state = ids.reduce(markTried, createInitialState('en'))
  return buildBookModel({ progress: computeProgress(state, content), content, lang: 'en', now: new Date(2026, 9, 20), ...opts })
}

describe('drawBookSheet', () => {
  test('the cover shows the brand and, when given, the holder name', () => {
    const ctx = createRecordingCtx()
    drawBookSheet(ctx, model([], { displayName: 'Rafi' }), 0)
    expect(ctx.texts().join('|')).toContain('Food Passport Bangladesh')
    expect(ctx.texts()).toContain('Rafi')
  })

  test('the first spread has the holder data page and the first visa page with its seal', () => {
    const m = model(['dinajpur-katarivog', 'natore-kacha-gola'])
    const ctx = createRecordingCtx()
    drawBookSheet(ctx, m, 1)
    const texts = ctx.texts().join('|')
    for (const expected of ['Food Explorer', 'BANGLADESH FOODS TRIED', '3%', '2/64', 'Rice and Biryani', '1/3 · 33%', 'PAGE 01', 'VISA']) expect(texts).toContain(expected)
    expect(texts).not.toMatch(/\bXP\b/)
    expect(ctx.texts().some((t) => /^FOOD<<?PASSPORT/.test(t))).toBe(true)
  })

  test('collected stamps are round seals with their name and district written on the ring', () => {
    const ctx = createRecordingCtx()
    drawBookSheet(ctx, model(), 1)
    const texts = ctx.texts()
    // latin names are set letter by letter along the ring, so look for the letters of the name
    for (const word of ['Katarivog Rice', 'Dinajpur']) expect([...word].every((ch) => texts.includes(ch))).toBe(true)
  })

  test('locked foods are listed by name (with district) so the explorer knows what to find', () => {
    const m = model([])
    const ctx = createRecordingCtx()
    drawBookSheet(ctx, m, 2)
    const names = m.sheets[2].left.slots.map((s) => s.name)
    for (const n of names) expect(ctx.texts().some((t) => t.startsWith(n.slice(0, 6)))).toBe(true)
  })

  test('a later spread draws two visa pages, one on each side of the spine', () => {
    const m = model()
    const ctx = createRecordingCtx()
    drawBookSheet(ctx, m, 3)
    const { left, right } = m.sheets[3]
    expect(ctx.texts()).toEqual(expect.arrayContaining([left.pageLabel, right.pageLabel]))
  })

  test('every sheet draws without throwing, including a last spread with a single page', () => {
    const m = model(foods.map((f) => f.id))
    m.sheets.forEach((_, i) => expect(() => drawBookSheet(createRecordingCtx(), m, i)).not.toThrow())
  })

  test('the holder photo is drawn on the data page when provided', () => {
    const photo = { width: 360, height: 500 }
    const ctx = createRecordingCtx()
    drawBookSheet(ctx, model(), 1, { photo })
    expect(ctx.calls.some((c) => c[0] === 'drawImage' && c[1] === photo)).toBe(true)
  })

  test('drawing is deterministic', () => {
    const run = () => { const c = createRecordingCtx(); drawBookSheet(c, model(), 3); return JSON.stringify(c.calls) }
    expect(run()).toBe(run())
  })
})

describe('renderBook', () => {
  const jpegBlob = () => new Blob([new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])], { type: 'image/jpeg' })
  const setup = () => {
    const ctx = createRecordingCtx()
    const canvases = []
    const makeCanvas = () => {
      const c = { width: 0, height: 0, getContext: () => ctx, toBlob: vi.fn((cb) => cb(jpegBlob())) }
      canvases.push(c)
      return c
    }
    return { ctx, canvases, makeCanvas }
  }
  const readText = (blob) => new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(new TextDecoder('latin1').decode(new Uint8Array(r.result)))
    r.readAsArrayBuffer(blob)
  })

  test('renders every sheet to a JPEG and returns one multi-page PDF', async () => {
    const m = model()
    const { makeCanvas, canvases } = setup()
    const { blob, filename } = await renderBook(m, { makeCanvas, fontsApi: null })
    expect(filename).toBe('food-passport-book.pdf')
    expect(blob.type).toBe('application/pdf')
    const s = await readText(blob)
    expect(s.startsWith('%PDF-1.4')).toBe(true)
    expect(s).toContain(`/Count ${m.sheets.length}`)
    expect(canvases[0].toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
    expect(canvases[0].width).toBe(1600)
  })

  test('reports progress after each page, in order', async () => {
    const m = model()
    const { makeCanvas } = setup()
    const calls = []
    await renderBook(m, { makeCanvas, fontsApi: null, onProgress: (done, total) => calls.push([done, total]) })
    expect(calls).toEqual(m.sheets.map((_, i) => [i + 1, m.sheets.length]))
  })

  test('loads the Bengali font for all of the text before drawing', async () => {
    const m = model()
    const { makeCanvas } = setup()
    const load = vi.fn().mockResolvedValue()
    await renderBook(m, { makeCanvas, fontsApi: { load, ready: Promise.resolve() } })
    expect(load).toHaveBeenCalledWith(expect.stringContaining('700'), m.sampleText)
  })

  test('an encoding failure rejects, so the caller can show an error', async () => {
    const ctx = createRecordingCtx()
    const makeCanvas = () => ({ width: 0, height: 0, getContext: () => ctx, toBlob: (cb) => cb(null) })
    await expect(renderBook(model(), { makeCanvas, fontsApi: null })).rejects.toThrow()
  })

  test('can be cancelled between pages', async () => {
    const { makeCanvas } = setup()
    const controller = new AbortController()
    const p = renderBook(model(), { makeCanvas, fontsApi: null, signal: controller.signal, onProgress: () => controller.abort() })
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })
})
