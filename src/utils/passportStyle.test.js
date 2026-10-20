import { INKS, STAMP_SHAPES, mrzLine, stampStyle, stampTilt, tiltFromPointer } from './passportStyle'

describe('stampTilt', () => {
  test('is deterministic per id and within ±6 degrees', () => {
    for (const id of ['chotpoti', 'bogura-doi', 'x', '']) {
      expect(stampTilt(id)).toBe(stampTilt(id))
      expect(Math.abs(stampTilt(id))).toBeLessThanOrEqual(6)
    }
  })
  test('varies between stamps so the page looks hand-stamped', () => {
    const tilts = new Set(Array.from({ length: 20 }, (_, i) => stampTilt(`food-${i}`)))
    expect(tilts.size).toBeGreaterThan(5)
  })
})

describe('mrzLine (decorative passport-style line)', () => {
  test('is exactly 44 characters from A-Z, 0-9 and <', () => {
    for (const text of ['street_food', 'FOOD<<PASSPORT', 'x'.repeat(100), 'চটপটি', '']) {
      expect(mrzLine(text)).toMatch(/^[A-Z0-9<]{44}$/)
    }
  })
  test('upper-cases and turns separators into fillers', () => {
    expect(mrzLine('street_food').startsWith('STREET<FOOD<')).toBe(true)
  })
  test('non-Latin text becomes fillers instead of garbage', () => {
    expect(mrzLine('চটপটি')).toBe('<'.repeat(44))
  })
})

describe('tiltFromPointer', () => {
  const rect = { left: 100, top: 100, width: 200, height: 400 }
  test('no tilt at the centre', () => {
    expect(tiltFromPointer(rect, 200, 300, 10)).toEqual({ rx: 0, ry: 0 })
  })
  test('tilts toward the pointer, up to the maximum', () => {
    expect(tiltFromPointer(rect, 300, 300, 10)).toEqual({ rx: 0, ry: 10 })
    expect(tiltFromPointer(rect, 200, 100, 10)).toEqual({ rx: 10, ry: 0 })
  })
  test('clamps when the pointer is outside the box', () => {
    expect(tiltFromPointer(rect, 9999, -9999, 10)).toEqual({ rx: 10, ry: 10 })
  })
})

describe('stampStyle (each rubber stamp gets its own shape and ink)', () => {
  test('is deterministic and uses only known shapes and inks', () => {
    for (const id of ['chotpoti', 'bogura-doi', 'x', '']) {
      expect(stampStyle(id)).toEqual(stampStyle(id))
      expect(STAMP_SHAPES).toContain(stampStyle(id).shape)
      expect(Object.keys(INKS)).toContain(stampStyle(id).ink)
      expect(stampStyle(id).tilt).toBe(stampTilt(id))
    }
  })
  test('varies across foods so a page does not look machine-made', () => {
    const styles = Array.from({ length: 40 }, (_, i) => stampStyle(`food-${i}`))
    expect(new Set(styles.map((s) => s.shape)).size).toBe(STAMP_SHAPES.length)
    expect(new Set(styles.map((s) => s.ink)).size).toBeGreaterThan(2)
  })
  test('inks are dark enough to stay legible on cream paper', () => {
    for (const hex of Object.values(INKS)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      expect(0.299 * r + 0.587 * g + 0.114 * b).toBeLessThan(140)
    }
  })
})
