/** Deterministic tilt in degrees (-6..6) so each stamp looks hand-pressed, but never changes between renders. */
export function stampTilt(id) {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (h % 1201) / 100 - 6
}

export const STAMP_SHAPES = ['round', 'oval', 'rect', 'octagon']

/** Real immigration stamps use a handful of dark inks; all stay legible on cream paper. */
export const INKS = { green: '#174B32', blue: '#1F3F8F', red: '#A12B2B', violet: '#5B2F86', black: '#26302B' }

const hash = (id) => {
  let h = 0
  for (const ch of String(id)) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  return h
}

/** Deterministic look of one stamp (shape, ink, tilt), so it never changes between renders. */
export function stampStyle(id) {
  const h = hash(id)
  const inks = Object.keys(INKS)
  return {
    shape: STAMP_SHAPES[h % STAMP_SHAPES.length],
    ink: inks[Math.floor(h / STAMP_SHAPES.length) % inks.length],
    tilt: stampTilt(id),
  }
}

/** Decorative passport-style machine-readable line: 44 chars of A-Z, 0-9 and '<'. Not a real document format. */
export function mrzLine(text, length = 44) {
  const s = String(text).toUpperCase().replace(/[^A-Z0-9]+/g, '<')
  return s.slice(0, length).padEnd(length, '<')
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Card tilt (degrees) toward the pointer: right edge -> +ry, top edge -> +rx. */
export function tiltFromPointer(rect, x, y, max = 10) {
  const nx = clamp((x - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1)
  const ny = clamp((rect.top + rect.height / 2 - y) / (rect.height / 2), -1, 1)
  return { rx: ny * max + 0, ry: nx * max + 0 }
}
