import { createRecordingCtx } from '../test/recordingCtx'
import { CARD_HEIGHT, CARD_WIDTH, arcLayout, drawShareCard, fitText, stampGrid } from './shareCard'

const model = (over = {}) => ({
  lang: 'bn', brand: 'Food Passport Bangladesh', tagline: 'বাংলাদেশের স্বাদ নিন।',
  title: 'রাফি-এর ফুড পাসপোর্ট', displayName: 'রাফি', siteUrl: null,
  fields: [
    { label: 'নাম', value: 'রাফি' }, { label: 'লেভেল', value: '১ · কৌতূহলী' }, { label: 'মোট XP', value: '৭০' },
    { label: 'স্ট্যাম্প', value: '২/৮৩' }, { label: 'ইস্যু', value: '২০ অক্টো ২০২৬' },
  ],
  level: { name: 'কৌতূহলী', progress: 0.7, nextText: 'আরও ৩০ XP' },
  pageLabel: 'পাতা ০১', stampsLabel: 'সাম্প্রতিক স্ট্যাম্প', collectedLabel: 'সংগৃহীত',
  emptyText: 'আপনার প্রথম স্ট্যাম্প সংগ্রহ করুন!',
  stamps: [
    { name: 'চটপটি', category: 'street_food', entryNo: '001', imageUrl: null, tilt: 3, shape: 'round', ink: '#174B32', district: 'ঢাকা' },
    { name: 'ফুচকা', category: 'street_food', entryNo: '001', imageUrl: '/x.jpg', tilt: -4, shape: 'oval', ink: '#A12B2B', district: null },
  ],
  details: [{ label: 'জাতীয়তা', value: 'বাংলাদেশি ফুডি' }, { label: 'মেয়াদ', value: 'আজীবন' }],
  signatureLabel: 'বহনকারীর স্বাক্ষর', visaLabel: 'ভিসা', entryLabel: 'নং', stampHereLabel: 'এখানে স্ট্যাম্প',
  badges: ['প্রথম কামড়'], selfReported: 'স্ব-ঘোষিত অগ্রগতি',
  mrz: ['FOOD<PASSPORT<EXPLORER<<<<<<<<<<<<<<<<<<<<<<<'.slice(0, 44).padEnd(44, '<'), '2<70<1<<20261020'.padEnd(44, '<')],
  ...over,
})

test('card is a landscape open-passport spread', () => {
  expect(CARD_WIDTH / CARD_HEIGHT).toBeGreaterThan(1.3)
  expect(CARD_WIDTH / CARD_HEIGHT).toBeLessThan(1.5)
})

test('draws every required element as text', () => {
  const ctx = createRecordingCtx()
  drawShareCard(ctx, model(), [])
  const texts = ctx.texts().join('|')
  for (const expected of [
    'Food Passport Bangladesh', 'রাফি', 'কৌতূহলী', '৭০', '২/৮৩', '২০ অক্টো ২০২৬', 'নাম'.toUpperCase(), 'চটপটি', 'ফুচকা',
    'সংগৃহীত', 'প্রথম কামড়', 'স্ব-ঘোষিত অগ্রগতি', 'পাতা ০১', 'সাম্প্রতিক স্ট্যাম্প',
  ]) {
    expect(texts).toContain(expected)
  }
})

test('prints both machine-readable lines', () => {
  const ctx = createRecordingCtx()
  const m = model()
  drawShareCard(ctx, m, [])
  for (const line of m.mrz) expect(ctx.texts()).toContain(line)
})

test('missing images fall back to the category icon; a loaded image is drawn instead', () => {
  const ctx = createRecordingCtx()
  drawShareCard(ctx, model(), [null, { width: 100, height: 100 }])
  expect(ctx.texts().filter((t) => t === '🥟')).toHaveLength(0) // vector line-art, never an emoji
  expect(ctx.calls.filter((c) => c[0] === 'drawImage')).toHaveLength(1)
})

test('a failed/absent image list never throws', () => {
  expect(() => drawShareCard(createRecordingCtx(), model(), undefined)).not.toThrow()
  expect(() => drawShareCard(createRecordingCtx(), model(), [null, null])).not.toThrow()
})

test('empty passport shows the encouragement text and blank dashed slots', () => {
  const ctx = createRecordingCtx()
  drawShareCard(ctx, model({ stamps: [], badges: [] }), [])
  expect(ctx.texts()).toContain('আপনার প্রথম স্ট্যাম্প সংগ্রহ করুন!')
  expect(ctx.calls.some((c) => c[0] === 'setLineDash' && c[1].length > 0)).toBe(true)
})

test('each stamp is tilted like a hand-pressed rubber stamp', () => {
  const ctx = createRecordingCtx()
  drawShareCard(ctx, model(), [])
  const rotations = ctx.calls.filter((c) => c[0] === 'rotate').map((c) => c[1])
  expect(rotations).toContain((3 * Math.PI) / 180)
  expect(rotations).toContain((-4 * Math.PI) / 180)
})

test('shows the site URL on the card when available', () => {
  const ctx = createRecordingCtx()
  drawShareCard(ctx, model({ siteUrl: 'https://example.com/fp' }), [])
  expect(ctx.texts()).toContain('https://example.com/fp')
})

test('level progress is clamped to the bar', () => {
  expect(() => drawShareCard(createRecordingCtx(), model({ level: { name: 'x', progress: 5, nextText: '' } }), [])).not.toThrow()
  expect(() => drawShareCard(createRecordingCtx(), model({ level: { name: 'x', progress: -1, nextText: '' } }), [])).not.toThrow()
})

test('long text shrinks the font before it is truncated', () => {
  const sizes = []
  const ctx = createRecordingCtx()
  let font = ''
  Object.defineProperty(ctx, 'font', { get: () => font, set: (v) => { font = v; sizes.push(Number(/(\d+)px/.exec(v)[1])) } })
  ctx.measureText = (s) => ({ width: String(s).length * Number(/(\d+)px/.exec(font)[1]) * 0.5 })
  const long = 'খাদ্য অনুসন্ধানী খাদ্য অনুসন্ধানী'
  drawShareCard(ctx, model({ stampsLabel: long }), [])
  expect(Math.min(...sizes.filter((n) => n >= 28 && n <= 40))).toBeLessThan(40)
  expect(ctx.texts()).toContain(long)
})

describe('fitText', () => {
  const ctx = createRecordingCtx() // 10px per character
  test('leaves short text alone', () => expect(fitText(ctx, 'abc', 100)).toBe('abc'))
  test('truncates with an ellipsis to fit', () => {
    const out = fitText(ctx, 'abcdefghij', 55)
    expect(out).toBe('abcd…')
    expect(ctx.measureText(out).width).toBeLessThanOrEqual(55)
  })
})

describe('real-passport look', () => {
  test('prints the visa label, district, nationality, validity and signature line', () => {
    const ctx = createRecordingCtx()
    const stamps = [{ name: 'চটপটি', category: 'street_food', entryNo: '001', imageUrl: null, tilt: 3, shape: 'rect', ink: '#174B32', district: 'ঢাকা' }]
    drawShareCard(ctx, model({ stamps }), [])
    const texts = ctx.texts().join('|')
    for (const expected of ['ভিসা', 'ঢাকা', 'জাতীয়তা', 'বাংলাদেশি ফুডি', 'আজীবন', 'বহনকারীর স্বাক্ষর', 'FOOD PASSPORT']) {
      expect(texts).toContain(expected)
    }
  })

  test('empty slots say where to stamp', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: [] }), [])
    expect(ctx.texts().filter((t) => t === 'এখানে স্ট্যাম্প')).toHaveLength(6)
  })

  test('each stamp is inked in its own colour', () => {
    const ctx = createRecordingCtx()
    const seen = new Set()
    Object.defineProperty(ctx, 'strokeStyle', { set(v) { seen.add(v) }, get: () => '' })
    drawShareCard(ctx, model(), [])
    expect(seen.has('#174B32')).toBe(true)
    expect(seen.has('#A12B2B')).toBe(true)
  })

  test('every stamp shape draws without throwing', () => {
    for (const shape of ['round', 'oval', 'rect', 'octagon']) {
      const stamps = [{ name: 'A', category: 'street_food', entryNo: '001', imageUrl: null, tilt: 0, shape, ink: '#174B32', district: 'X' }]
      expect(() => drawShareCard(createRecordingCtx(), model({ stamps }), [])).not.toThrow()
    }
  })

  test('paints a spine: stitch lines down the centre of the spread', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model(), [])
    const centre = CARD_WIDTH / 2
    expect(ctx.calls.some((c) => c[0] === 'moveTo' && Math.abs(c[1] - centre) < 12 && c[2] <= 120)).toBe(true)
  })
})

describe('stampGrid (every collected stamp fits on the card)', () => {
  const AREA = { w: 630, h: 770 }
  test('up to 6 stamps keep the roomy 3x2 layout with empty guide slots', () => {
    for (const n of [0, 1, 6]) {
      const g = stampGrid(n)
      expect(g).toMatchObject({ mode: 'full', cols: 3, scale: 1, slots: 6 })
    }
  })
  test('more stamps shrink them instead of dropping any', () => {
    let last = 1
    for (const n of [7, 12, 13, 20, 21, 30]) {
      const g = stampGrid(n)
      expect(g.mode).toBe('full')
      expect(g.slots).toBe(n)
      expect(g.scale).toBeLessThanOrEqual(last)
      last = g.scale
    }
    expect(stampGrid(7).scale).toBeLessThan(1)
  })
  test('beyond 30 stamps the card switches to compact icon badges', () => {
    expect(stampGrid(31).mode).toBe('mini')
    expect(stampGrid(83)).toMatchObject({ mode: 'mini', slots: 83 })
  })
  test('every tier fits inside the page area, up to the whole catalogue', () => {
    for (let n = 0; n <= 83; n++) {
      const g = stampGrid(n)
      const rows = Math.ceil(g.slots / g.cols)
      expect(g.cols * g.cellW).toBeLessThanOrEqual(AREA.w + 0.01)
      expect(rows * g.cellH).toBeLessThanOrEqual(AREA.h + 0.01)
      expect(g.cols * rows).toBeGreaterThanOrEqual(g.slots)
    }
  })
})

describe('many stamps on the card', () => {
  const stampsOf = (n) => Array.from({ length: n }, (_, i) => ({
    name: `খাবার${i}`, category: 'street_food', entryNo: '001', imageUrl: null, tilt: (i % 9) - 4, shape: ['round', 'oval', 'rect', 'octagon'][i % 4], ink: '#174B32', district: null,
  }))
  test('draws the name of every stamp up to 30', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: stampsOf(30) }), [])
    for (let i = 0; i < 30; i++) expect(ctx.texts().some((t) => t.startsWith(`খাবার${i}`))).toBe(true)
  })
  test('draws one icon badge per stamp when there are many', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: stampsOf(83) }), [])
    expect(ctx.texts().filter((t) => t === '🥟')).toHaveLength(0)
    const strokes = (n) => { const c = createRecordingCtx(); drawShareCard(c, model({ stamps: stampsOf(n) }), []); return c.calls.filter((x) => x[0] === 'stroke').length }
    expect(strokes(83)).toBeGreaterThan(strokes(31))
  })
})

describe('seal details', () => {
  const one = (shape, over = {}) => [{ name: 'চটপটি', category: 'street_food', entryNo: '007', imageUrl: null, tilt: 0, shape, ink: '#174B32', district: 'ঢাকা', ...over }]

  test('prints the entry number on every full-size stamp', () => {
    for (const shape of ['round', 'oval', 'rect', 'octagon']) {
      const ctx = createRecordingCtx()
      drawShareCard(ctx, model({ stamps: one(shape) }), [])
      expect(ctx.texts().some((t) => t.includes('নং') && t.includes('007'))).toBe(true)
    }
  })

  test('round seals set the brand along a curve, one letter at a time', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: one('round') }), [])
    const letters = ctx.texts().filter((t) => t.length === 1 && /[A-Z]/.test(t))
    expect(letters.join('')).toContain('FOODPASSPORT')
    expect(ctx.calls.filter((c) => c[0] === 'rotate').length).toBeGreaterThan(12)
  })

  test('other seals keep the brand as straight text', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: one('rect') }), [])
    expect(ctx.texts()).toContain('FOOD PASSPORT')
  })

  test('the stamp icon is vector line-art in the stamp ink, not an emoji', () => {
    const ctx = createRecordingCtx()
    const seen = new Set()
    Object.defineProperty(ctx, 'strokeStyle', { set(v) { seen.add(v) }, get: () => '' })
    drawShareCard(ctx, model({ stamps: one('rect', { ink: '#5B2F86' }) }), [])
    expect(seen.has('#5B2F86')).toBe(true)
    expect(ctx.texts().filter((t) => t.length <= 2).some((t) => /\p{Extended_Pictographic}/u.test(t))).toBe(false) // no lone emoji glyphs
  })

  test('inking is deterministic: the same stamp always draws the same marks', () => {
    const run = () => { const c = createRecordingCtx(); drawShareCard(c, model({ stamps: one('oval') }), []); return JSON.stringify(c.calls) }
    expect(run()).toBe(run())
  })
})

describe('arcLayout (letters placed along a curve)', () => {
  test('is centred on the top of the circle and advances left to right', () => {
    const a = arcLayout([10, 10, 10, 10, 10], 50)
    expect(a).toHaveLength(5)
    expect(a[2]).toBeCloseTo(-Math.PI / 2, 5)
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThan(a[i - 1])
    expect(a[0] + a[4]).toBeCloseTo(-Math.PI, 5)
  })
  test('letter spacing matches the arc length: width / radius radians', () => {
    const a = arcLayout([20, 20], 40)
    expect(a[1] - a[0]).toBeCloseTo(20 / 40, 5)
  })
})

describe('holder photo', () => {
  const photo = { width: 360, height: 500 }
  const drawsPhoto = (ctx) => ctx.calls.filter((c) => c[0] === 'drawImage' && c[1] === photo)

  test('is drawn into the photo frame on the data page when provided', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: [] }), [], photo)
    const draws = drawsPhoto(ctx)
    expect(draws).toHaveLength(1)
    const [, , x, y, w, h] = draws[0]
    expect([x, y, w, h]).toEqual([80, 215, 230, 320])
  })

  test('is clipped to the frame so it cannot spill over the page', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: [] }), [], photo)
    const names = ctx.calls.map((c) => c[0])
    expect(names.lastIndexOf('clip', names.findIndex((n, i) => n === 'drawImage' && ctx.calls[i][1] === photo))).toBeGreaterThan(-1)
  })

  test('without a photo the emblem stays and no photo is drawn', () => {
    const ctx = createRecordingCtx()
    drawShareCard(ctx, model({ stamps: [] }), [], null)
    expect(drawsPhoto(ctx)).toHaveLength(0)
  })

  test('the photo frame keeps its gold border with a photo too', () => {
    const ctx = createRecordingCtx()
    const seen = new Set()
    Object.defineProperty(ctx, 'strokeStyle', { set(v) { seen.add(v) }, get: () => '' })
    drawShareCard(ctx, model({ stamps: [] }), [], photo)
    expect(seen.has('#D6AD57')).toBe(true)
  })
})
