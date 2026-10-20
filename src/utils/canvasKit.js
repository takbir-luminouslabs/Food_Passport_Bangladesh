// Low-level canvas helpers shared by the share card, the passport book PDF and the page art.
// Open passport spread, 1600x1130 (~1.42:1, the ratio of a real booklet opened flat).
export const CARD_WIDTH = 1600
export const CARD_HEIGHT = 1130
export const FONT_FAMILY_NAME = 'Noto Sans Bengali Variable'
// Self-hosted via @fontsource (no external font requests). Generic fallbacks keep the export working if it fails.
export const FONT_STACK = `"${FONT_FAMILY_NAME}", "Noto Sans Bengali", system-ui, sans-serif`
export const MONO_STACK = '"Courier New", Menlo, Consolas, monospace'

export const COLOR = {
  primary: '#174B32', dark: '#10251C', lime: '#D9F99D', cream: '#FBF8EF',
  muted: '#66736A', gold: '#D6AD57', goldLight: '#F6E3AE', leather: '#1F6143', ink: '#174B32',
}

/** Truncate with an ellipsis so the text fits `maxWidth`. */
export function fitText(ctx, text, maxWidth) {
  const s = String(text)
  if (ctx.measureText(s).width <= maxWidth) return s
  let out = s
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1)
  return `${out}…`
}

export function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Draw one line of text. With `maxWidth`, the font shrinks (down to `minSize`) before the text is truncated,
 * so long Bengali names stay readable instead of being cut off. No letter-spacing: it would split Bengali conjuncts.
 */
export function text(ctx, str, x, y, { size, minSize = size, weight = 400, color, align = 'left', maxWidth, family = FONT_STACK }) {
  let px = size
  ctx.font = `${weight} ${px}px ${family}`
  while (maxWidth && px > minSize && ctx.measureText(str).width > maxWidth) {
    px -= 2
    ctx.font = `${weight} ${px}px ${family}`
  }
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(maxWidth ? fitText(ctx, str, maxWidth) : str, x, y)
}

/** The bowl-and-steam emblem, drawn with plain paths (mirrors components/Emblem.jsx; viewBox 120). */
export function drawEmblem(ctx, cx, cy, size, color) {
  const s = size / 120
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(s, s)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(60, 60, 55, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 1
  ctx.setLineDash([1.5, 3.5])
  ctx.beginPath()
  ctx.arc(60, 60, 48, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = 2.5
  for (const [x, y, rise] of [[48, 56, 19], [60, 52, 21], [72, 56, 19]]) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(x - 6, y - 7, x, y - 13, x, y - rise)
    ctx.bezierCurveTo(x, y - rise - 6, x - 5, y - rise - 8, x - 3, y - rise - 13)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(28, 64)
  ctx.lineTo(92, 64)
  ctx.arc(60, 64, 32, 0, Math.PI, false)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(46, 94, 28, 5)
  ctx.globalAlpha = 0.85
  for (const m of [1, -1]) {
    const x = m === 1 ? 36 : 84
    ctx.beginPath()
    ctx.moveTo(x, 98)
    ctx.bezierCurveTo(x - 14 * m, 97, x - 19 * m, 85, x - 20 * m, 75)
    ctx.bezierCurveTo(x - 6 * m, 76, x, 84, x, 98)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export function paper(ctx, x, y, w, h, gutterSide) {
  ctx.save()
  roundedRect(ctx, x, y, w, h, 18)
  ctx.clip()
  ctx.fillStyle = COLOR.cream
  ctx.fillRect(x, y, w, h)
  // guilloche rings + fine security lines
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(23,75,50,0.06)'
  const cx = gutterSide === 'right' ? x + w * 0.82 : x + w * 0.18
  for (let r = 24; r < 420; r += 13) {
    ctx.beginPath()
    ctx.arc(cx, y + h * 0.22, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(23,75,50,0.035)'
  for (let yy = y + 8; yy < y + h; yy += 9) {
    ctx.beginPath()
    ctx.moveTo(x, yy)
    ctx.lineTo(x + w, yy)
    ctx.stroke()
  }
  // shadow where the page curves into the fold
  const gx = gutterSide === 'right' ? x + w : x
  const grad = ctx.createLinearGradient(gx, 0, gutterSide === 'right' ? gx - 90 : gx + 90, 0)
  grad.addColorStop(0, 'rgba(16,37,28,0.32)')
  grad.addColorStop(1, 'rgba(16,37,28,0)')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

/** Angles (radians) for letters of the given widths laid along a circle of `radius`, centred on the top, left to right. */
export function arcLayout(widths, radius) {
  const total = widths.reduce((sum, w) => sum + w, 0)
  let acc = 0
  return widths.map((w) => {
    const mid = acc + w / 2
    acc += w
    return -Math.PI / 2 + (mid - total / 2) / radius
  })
}

/** Latin-only text set along the top of a circle (curving Bengali would split its conjuncts). */
export function arcText(ctx, str, radius, { size, weight = 700, color }) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const chars = [...str]
  const angles = arcLayout(chars.map((ch) => ctx.measureText(ch).width + 1.5), radius)
  chars.forEach((ch, i) => {
    ctx.save()
    ctx.rotate(angles[i] + Math.PI / 2)
    ctx.translate(0, -radius)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
}

/** The same along the bottom of a circle, reading left to right with the letter tops toward the centre. */
export function arcTextBottom(ctx, str, radius, { size, weight = 700, color }) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const chars = [...str]
  const angles = arcLayout(chars.map((ch) => ctx.measureText(ch).width + 1.5), radius)
  chars.forEach((ch, i) => {
    // arcLayout is centred on the top and runs clockwise; along the bottom the same offsets run the other way
    const theta = -angles[i]
    ctx.save()
    ctx.rotate(theta - Math.PI / 2)
    ctx.translate(0, radius)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
}

/** The open booklet: leather cover edge, two cream pages, and the spine with its stitching. */
export function drawSpreadFrame(ctx) {
  const W = CARD_WIDTH
  const H = CARD_HEIGHT
  // leather cover peeking out around the two pages
  const leather = ctx.createLinearGradient(0, 0, W, H)
  leather.addColorStop(0, COLOR.leather)
  leather.addColorStop(0.5, COLOR.primary)
  leather.addColorStop(1, COLOR.dark)
  ctx.fillStyle = leather
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(214,173,87,0.55)'
  ctx.lineWidth = 2
  ctx.setLineDash([12, 9])
  roundedRect(ctx, 16, 16, W - 32, H - 32, 20)
  ctx.stroke()
  ctx.setLineDash([])

  const PW = 750
  const PY = 40
  const PH = 1050
  paper(ctx, 40, PY, PW, PH, 'right')
  paper(ctx, 810, PY, PW, PH, 'left')

  // spine: dark fold shading with two stitch lines
  const fold = ctx.createLinearGradient(W / 2 - 46, 0, W / 2 + 46, 0)
  fold.addColorStop(0, 'rgba(8,20,14,0)')
  fold.addColorStop(0.5, 'rgba(8,20,14,0.7)')
  fold.addColorStop(1, 'rgba(8,20,14,0)')
  ctx.fillStyle = fold
  ctx.fillRect(W / 2 - 46, PY, 92, PH)
  ctx.strokeStyle = 'rgba(227,192,111,0.85)'
  ctx.lineWidth = 2
  ctx.setLineDash([14, 10])
  for (const sx of [W / 2 - 5, W / 2 + 5]) {
    ctx.beginPath()
    ctx.moveTo(sx, 100)
    ctx.lineTo(sx, PY + PH - 60)
    ctx.stroke()
  }
  ctx.setLineDash([])
}

/** Make sure the Bengali font is actually loaded before drawing, otherwise canvas silently uses a fallback. */
export async function ensureFonts(fontsApi, sampleText) {
  if (!fontsApi?.load) return
  try {
    await Promise.all([
      fontsApi.load(`400 24px ${FONT_STACK}`, sampleText),
      fontsApi.load(`700 24px ${FONT_STACK}`, sampleText),
    ])
    await fontsApi.ready
  } catch {
    // fall back to system fonts rather than failing the export
  }
}

/**
 * Load the photos for some stamps (best effort): resolves to a Map of url -> image. A photo that fails or is
 * slow is simply left out, and its seal falls back to the category line-art.
 */
export async function loadStampImages(urls, { timeout = 4000, makeImage = () => new Image() } = {}) {
  const unique = [...new Set(urls.filter(Boolean))]
  const entries = await Promise.all(
    unique.map(
      (url) =>
        new Promise((resolve) => {
          let img
          try { img = makeImage() } catch { return resolve(null) }
          const timer = setTimeout(() => resolve(null), timeout)
          img.onload = () => { clearTimeout(timer); resolve([url, img]) }
          img.onerror = () => { clearTimeout(timer); resolve(null) }
          img.src = new URL(url, globalThis.document?.baseURI ?? globalThis.location?.href ?? 'http://localhost/').href
        }),
    ),
  )
  return new Map(entries.filter(Boolean))
}
