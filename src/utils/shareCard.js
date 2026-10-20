import { loadImage } from '../lib/loadImage'
import { formatNumber, pick, t } from './i18n'
import { INKS, mrzLine, stampStyle } from './passportStyle'
import { paintIcon } from './stampIcons'
import { LEVELS } from './xp'

// Open passport spread, 1600x1130 (~1.42:1, the ratio of a real booklet opened flat).
export const CARD_WIDTH = 1600
export const CARD_HEIGHT = 1130
export const FONT_FAMILY_NAME = 'Noto Sans Bengali Variable'
// Self-hosted via @fontsource (no external font requests). Generic fallbacks keep the export working if it fails.
export const FONT_STACK = `"${FONT_FAMILY_NAME}", "Noto Sans Bengali", system-ui, sans-serif`
export const MONO_STACK = '"Courier New", Menlo, Consolas, monospace'
const MAX_NAME = 30
const MAX_BADGES = 3

export const COLOR = {
  primary: '#174B32', dark: '#10251C', lime: '#D9F99D', cream: '#FBF8EF',
  muted: '#66736A', gold: '#D6AD57', goldLight: '#F6E3AE', leather: '#1F6143', ink: '#174B32',
}

// ---------- model (everything the card shows; nothing else can leak onto it) ----------

const cleanName = (raw) => {
  // eslint-disable-next-line no-control-regex
  const s = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim()
  return s === '' ? null : s
}

const formatDate = (date, lang) =>
  new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)

const compactDate = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

/** What a collected stamp shows: name, icon category, entry number (collection order), shape/ink and district. */
export function stampFromFood(f, entry, lang) {
  const style = stampStyle(f.id)
  return {
    name: pick(f, 'name', lang),
    category: f.category,
    entryNo: formatNumber(entry, lang, { minimumIntegerDigits: 3, useGrouping: false }),
    imageUrl: f.image_url ?? null,
    tilt: style.tilt,
    shape: style.shape,
    ink: INKS[style.ink],
    district: f.region ? pick(f.region, 'district', lang) || null : null,
  }
}

/**
 * Build the display model from derived progress + content. The saved state object is deliberately not an
 * input, so nothing outside the whitelisted fields below can reach the card. "Issued" is just today's date.
 */
export function buildCardModel({ progress, content, lang, displayName = null, siteUrl = null, now = new Date() }) {
  const name = cleanName(displayName)
  const foodById = new Map(content.foods.map((f) => [f.id, f]))
  const next = LEVELS[progress.level.level]
  const earned = new Set(progress.earnedBadgeIds)
  const levelName = pick(progress.level, 'name', lang)
  const latinName = name && /^[\x20-\x7e]+$/.test(name) ? name : 'EXPLORER'

  const order = new Map([...progress.triedIds].map((id, i) => [id, i + 1]))
  const stamps = [...progress.triedIds]
    .reverse()
    .map((id) => foodById.get(id))
    .filter(Boolean)
    .map((f) => stampFromFood(f, order.get(f.id), lang))

  return {
    lang,
    brand: t(lang, 'brand.name'),
    tagline: t(lang, 'brand.tagline'),
    title: name ? t(lang, 'share.titleNamed', { name }) : t(lang, 'share.title'),
    displayName: name,
    siteUrl: siteUrl || null,
    fields: [
      { label: t(lang, 'share.field.name'), value: name ?? t(lang, 'share.holderDefault') },
      { label: t(lang, 'stats.level'), value: `${formatNumber(progress.level.level, lang)} · ${levelName}` },
      { label: t(lang, 'stats.totalXp'), value: formatNumber(progress.totalXp, lang) },
      { label: t(lang, 'passport.stamps'), value: `${formatNumber(progress.triedCount, lang)}/${formatNumber(content.foods.length, lang)}` },
      { label: t(lang, 'share.field.issued'), value: formatDate(now, lang) },
    ],
    level: {
      name: levelName,
      progress: progress.level.progress,
      nextText: next
        ? t(lang, 'stats.xpToNext', { xp: formatNumber(progress.level.xpToNext, lang), level: pick(next, 'name', lang) })
        : t(lang, 'stats.maxLevel'),
    },
    details: [
      { label: t(lang, 'share.field.nationality'), value: t(lang, 'share.nationality') },
      { label: t(lang, 'share.field.validity'), value: t(lang, 'share.validity') },
    ],
    signatureLabel: t(lang, 'share.signature'),
    visaLabel: t(lang, 'share.visa'),
    entryLabel: t(lang, 'stamp.no'),
    stampHereLabel: t(lang, 'share.stampHere'),
    pageLabel: t(lang, 'passport.page', { n: formatNumber(1, lang, { minimumIntegerDigits: 2 }) }),
    stampsLabel: t(lang, 'share.stamps'),
    collectedLabel: t(lang, 'stamp.collected'),
    emptyText: t(lang, 'share.empty'),
    stamps,
    badges: content.badges.filter((b) => earned.has(b.id)).slice(0, MAX_BADGES).map((b) => pick(b, 'name', lang)),
    selfReported: t(lang, 'share.selfReported'),
    mrz: [
      mrzLine(`FOOD<<PASSPORT<<${latinName}`),
      mrzLine(`${progress.triedCount}<${progress.totalXp}<${progress.level.level}<<${compactDate(now)}`),
    ],
  }
}

// ---------- drawing (works on any CanvasRenderingContext2D-compatible context) ----------

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

// Each shape has its own size and text layout (y measured from the stamp centre) so text always sits inside the outline.
const STAMP_LAYOUT = {
  round: { w: 200, h: 200, topY: null, arcR: 62, cy: -20, r: 22, nameY: 32, subY: 52, lastY: null, entryY: 74 },
  oval: { w: 200, h: 270, topY: -92, cy: -50, r: 32, nameY: 22, subY: 44, lastY: 70, entryY: 94 },
  rect: { w: 200, h: 300, topY: -112, cy: -60, r: 38, nameY: 22, subY: 46, lastY: 86, entryY: 112 },
  octagon: { w: 200, h: 250, topY: -88, cy: -50, r: 30, nameY: 18, subY: 40, lastY: 64, entryY: 88 },
}
const OCTAGON_CUT = 46

const rgba = (hex, alpha) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${alpha})`
}

/** Tiny deterministic PRNG, so worn-ink speckles are identical on every render. */
function seeded(seed) {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seedOf = (str) => [...String(str)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)

/** Outline of a stamp centred on (0,0). `inset` shrinks it for the inner ring. */
function stampPath(ctx, shape, w, h, inset) {
  const hw = w / 2 - inset
  const hh = h / 2 - inset
  if (shape === 'round' || shape === 'oval') {
    ctx.save()
    ctx.scale(1, hh / hw)
    ctx.beginPath()
    ctx.arc(0, 0, hw, 0, Math.PI * 2)
    ctx.restore() // the path keeps the squashed shape; strokes drawn afterwards stay uniform
  } else if (shape === 'octagon') {
    const c = Math.max(8, OCTAGON_CUT - inset * 0.4)
    ctx.beginPath()
    ctx.moveTo(-hw + c, -hh)
    ctx.lineTo(hw - c, -hh)
    ctx.lineTo(hw, -hh + c)
    ctx.lineTo(hw, hh - c)
    ctx.lineTo(hw - c, hh)
    ctx.lineTo(-hw + c, hh)
    ctx.lineTo(-hw, hh - c)
    ctx.lineTo(-hw, -hh + c)
    ctx.closePath()
  } else {
    roundedRect(ctx, -hw, -hh, hw * 2, hh * 2, 14)
  }
}

/** Width of the stamp at height y, so each line of text can be fitted inside the outline. */
function chordWidth(shape, L, y) {
  const a = L.w / 2
  const b = L.h / 2
  if (shape === 'round' || shape === 'oval') return 2 * a * Math.sqrt(Math.max(0, 1 - (y / b) ** 2))
  if (shape === 'octagon') return L.w - 2 * Math.max(0, Math.abs(y) - (b - OCTAGON_CUT))
  return L.w
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
function arcText(ctx, str, radius, { size, weight = 700, color }) {
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

/** A line of centred text led by a small line icon (tick, medal), fitted to `maxWidth` as a whole. */
function iconLine(ctx, icon, str, ly, { color, maxWidth, ...opts }) {
  const size = 16
  const gap = 6
  const room = maxWidth - size - gap
  text(ctx, str, (size + gap) / 2, ly, { align: 'center', color, maxWidth: room, ...opts })
  const width = ctx.measureText(fitText(ctx, str, room)).width
  paintIcon(ctx, icon, (size + gap) / 2 - width / 2 - gap - size / 2, ly - size * 0.35, size, color, 9)
}

/** One inked rubber stamp: its own shape and colour, double border, worn-ink speckles. */
export function drawStamp(ctx, stamp, image, x, y, collectedLabel, brandLabel, entryLabel, scale = 1) {
  const shape = STAMP_LAYOUT[stamp.shape] ? stamp.shape : 'rect'
  const L = STAMP_LAYOUT[shape]
  const ink = stamp.ink || COLOR.ink
  const line = (str, ly, opts) => {
    const maxWidth = chordWidth(shape, L, ly) - 40
    if (maxWidth > 20) text(ctx, str, 0, ly, { align: 'center', color: ink, ...opts, maxWidth })
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(((stamp.tilt ?? 0) * Math.PI) / 180)
  ctx.scale(scale, scale)
  ctx.globalAlpha = 0.9

  // a faint, slightly shifted second impression, like a stamp that moved a hair when pressed
  ctx.save()
  ctx.translate(1, 0.8)
  ctx.globalAlpha = 0.22
  stampPath(ctx, shape, L.w, L.h, 0)
  ctx.strokeStyle = ink
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.restore()

  stampPath(ctx, shape, L.w, L.h, 0)
  ctx.fillStyle = rgba(ink, 0.06)
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = 6
  ctx.stroke()
  stampPath(ctx, shape, L.w, L.h, 13)
  ctx.lineWidth = 2
  ctx.stroke()
  // dotted rope ring
  stampPath(ctx, shape, L.w, L.h, 21)
  ctx.lineWidth = 2
  ctx.setLineDash([1.5, 5])
  ctx.stroke()
  ctx.setLineDash([])

  if (L.topY !== null) {
    line(brandLabel, L.topY, { size: 15, minSize: 11, weight: 700 })
    ctx.strokeStyle = ink
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-L.w / 2 + 34, L.topY + 12)
    ctx.lineTo(L.w / 2 - 34, L.topY + 12)
    ctx.stroke()
  } else {
    arcText(ctx, brandLabel, L.arcR, { size: 15, color: ink })
  }

  ctx.beginPath()
  ctx.arc(0, L.cy, L.r + 6, 0, Math.PI * 2)
  ctx.lineWidth = 2.5
  ctx.strokeStyle = ink
  if (image) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, L.cy, L.r + 6, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(image, -L.r - 6, L.cy - L.r - 6, (L.r + 6) * 2, (L.r + 6) * 2)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(0, L.cy, L.r + 6, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    ctx.fillStyle = rgba(ink, 0.08)
    ctx.fill()
    ctx.stroke()
    paintIcon(ctx, stamp.category, 0, L.cy, L.r * 1.5, ink, 5)
  }
  line(stamp.name, L.nameY, { size: 24, minSize: 12, weight: 700 })
  if (stamp.district) line(stamp.district, L.subY, { size: 18, minSize: 11 })
  if (L.lastY !== null) {
    const maxWidth = chordWidth(shape, L, L.lastY) - 40
    if (maxWidth > 20) iconLine(ctx, 'check', collectedLabel, L.lastY, { size: 16, minSize: 11, weight: 700, color: ink, maxWidth })
  }
  if (stamp.entryNo) line(`${entryLabel ?? ''} ${stamp.entryNo}`.trim(), L.entryY, { size: 15, minSize: 11, weight: 700 })

  // worn ink: uneven density plus tiny gaps, clipped to the outline (seeded, so every render is identical)
  stampPath(ctx, shape, L.w, L.h, 0)
  ctx.clip()
  ctx.fillStyle = COLOR.cream
  const rand = seeded(seedOf(`${stamp.name}${ink}`))
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = 0.07 + rand() * 0.1
    ctx.beginPath()
    ctx.arc((rand() - 0.5) * L.w, (rand() - 0.5) * L.h, 16 + rand() * 26, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.6
  for (let i = 0; i < 90; i++) {
    ctx.beginPath()
    ctx.arc((rand() - 0.5) * L.w, (rand() - 0.5) * L.h, 0.6 + rand() * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Compact stamp for passports with many stamps: just the outline and the food icon (or photo). */
function drawMiniStamp(ctx, stamp, image, x, y, size) {
  const shape = STAMP_LAYOUT[stamp.shape] ? stamp.shape : 'rect'
  const L = STAMP_LAYOUT[shape]
  const ink = stamp.ink || COLOR.ink
  const k = size / Math.max(L.w, L.h)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(((stamp.tilt ?? 0) * Math.PI) / 180)
  ctx.scale(k, k)
  ctx.globalAlpha = 0.9
  stampPath(ctx, shape, L.w, L.h, 0)
  ctx.fillStyle = rgba(ink, 0.1)
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = 14
  ctx.stroke()
  if (image) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, 0, 62, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(image, -62, -62, 124, 124)
    ctx.restore()
  } else {
    paintIcon(ctx, stamp.category, 0, 0, Math.min(L.w, L.h) * 0.6, ink, 8)
  }
  ctx.restore()
}

// Page area for stamps, and the tiers that keep every collected stamp on the card.
const GRID_AREA = { x: 890, y: 250, w: 630, h: 740 }
const FULL_TIERS = [{ max: 6, cols: 3, rows: 2 }, { max: 12, cols: 4, rows: 3 }, { max: 20, cols: 5, rows: 4 }, { max: 30, cols: 6, rows: 5 }]

/** Layout for `count` stamps: roomy up to 6 (with empty guide slots), shrinking up to 30, then compact icon badges. */
export function stampGrid(count) {
  const tier = FULL_TIERS.find((t) => count <= t.max)
  if (tier) {
    const cellW = GRID_AREA.w / tier.cols
    const cellH = GRID_AREA.h / tier.rows
    return { mode: 'full', cols: tier.cols, tierRows: tier.rows, scale: Math.min(1, cellW / 210, cellH / 320), cellW, cellH, slots: count <= 6 ? 6 : count }
  }
  const cols = 9
  const rows = Math.ceil(count / cols)
  return { mode: 'mini', cols, scale: 1, cellW: GRID_AREA.w / cols, cellH: Math.min(80, GRID_AREA.h / rows), slots: count }
}

/** An empty, pre-printed stamp area (like the guide boxes on a visa page). */
export function drawSlot(ctx, x, y, label, sublabel = null) {
  const w = 200
  const h = 270
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = 'rgba(102,115,106,0.5)'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 7])
  roundedRect(ctx, -w / 2, -h / 2, w, h, 12)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = 3
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath()
    ctx.moveTo(sx * (w / 2 - 12), sy * (h / 2 - 28))
    ctx.lineTo(sx * (w / 2 - 12), sy * (h / 2 - 12))
    ctx.lineTo(sx * (w / 2 - 28), sy * (h / 2 - 12))
    ctx.stroke()
  }
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, -20, 44, 0, Math.PI * 2)
  ctx.stroke()
  text(ctx, label, 0, 70, { size: 18, minSize: 12, color: 'rgba(102,115,106,0.85)', align: 'center', maxWidth: w - 40 })
  if (sublabel) text(ctx, sublabel, 0, 96, { size: 16, minSize: 11, color: 'rgba(102,115,106,0.7)', align: 'center', maxWidth: w - 40 })
  ctx.restore()
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

/** The holder data page (left page): brand, photo frame, details, level bar, badges, signature and MRZ lines. */
export function drawDataPage(ctx, m, photo = null) {
  // ---- left page: data page ----
  const rx = 80
  const gold = ctx.createLinearGradient(rx, 0, rx + 600, 0)
  gold.addColorStop(0, '#B98A2E')
  gold.addColorStop(0.5, '#E3C06F')
  gold.addColorStop(1, '#B98A2E')
  text(ctx, m.brand, rx, 115, { size: 40, weight: 700, color: gold, maxWidth: 670 })
  text(ctx, m.tagline, rx, 155, { size: 22, color: COLOR.muted, maxWidth: 670 })
  ctx.fillStyle = 'rgba(214,173,87,0.7)'
  ctx.fillRect(rx, 178, 670, 2)

  // "photo" frame: the holder's own photo if they added one, otherwise the emblem
  const frame = ctx.createLinearGradient(rx, 215, rx + 230, 535)
  frame.addColorStop(0, COLOR.leather)
  frame.addColorStop(1, COLOR.dark)
  ctx.fillStyle = frame
  roundedRect(ctx, rx, 215, 230, 320, 16)
  ctx.fill()
  if (photo) {
    ctx.save()
    roundedRect(ctx, rx, 215, 230, 320, 16)
    ctx.clip()
    ctx.drawImage(photo, rx, 215, 230, 320)
    ctx.restore()
  } else {
    drawEmblem(ctx, rx + 115, 375, 170, '#E3C06F')
  }
  ctx.strokeStyle = COLOR.gold
  ctx.lineWidth = 3
  roundedRect(ctx, rx, 215, 230, 320, 16)
  ctx.stroke()

  m.fields.forEach((f, i) => {
    const y = 215 + i * 64
    text(ctx, f.label.toUpperCase(), rx + 270, y + 16, { size: 18, color: COLOR.muted, maxWidth: 400 })
    text(ctx, f.value, rx + 270, y + 52, { size: 30, minSize: 18, weight: 700, color: COLOR.dark, maxWidth: 400 })
  })

  // level bar
  ctx.fillStyle = '#DDE3DA'
  roundedRect(ctx, rx, 590, 670, 22, 11)
  ctx.fill()
  const fill = Math.max(0, Math.min(1, Number.isFinite(m.level.progress) ? m.level.progress : 0))
  if (fill > 0) {
    ctx.fillStyle = COLOR.primary
    roundedRect(ctx, rx, 590, Math.max(22, 670 * fill), 22, 11)
    ctx.fill()
  }
  text(ctx, m.level.nextText, rx, 646, { size: 22, color: COLOR.muted, maxWidth: 670 })

  // badges
  let bx = rx
  for (const badge of m.badges) {
    ctx.font = `700 22px ${FONT_STACK}`
    const w = ctx.measureText(badge).width + 36 + 30
    if (bx + w > rx + 670) break
    ctx.fillStyle = COLOR.gold
    roundedRect(ctx, bx, 700, w, 46, 23)
    ctx.fill()
    paintIcon(ctx, 'medal', bx + 18 + 11, 723, 24, COLOR.dark, 8)
    text(ctx, badge, bx + 18 + 30, 732, { size: 22, weight: 700, color: COLOR.dark })
    bx += w + 12
  }

  // nationality / validity, like the data fields of a real passport
  ;(m.details ?? []).forEach((d, i) => {
    const dx = rx + i * 340
    text(ctx, d.label.toUpperCase(), dx, 790, { size: 18, color: COLOR.muted, maxWidth: 320 })
    text(ctx, d.value, dx, 826, { size: 28, minSize: 18, weight: 700, color: COLOR.dark, maxWidth: 320 })
  })

  // holder's signature line
  ctx.strokeStyle = 'rgba(23,75,50,0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(rx, 880)
  ctx.lineTo(rx + 420, 880)
  ctx.stroke()
  text(ctx, m.signatureLabel ?? '', rx, 904, { size: 18, color: COLOR.muted, maxWidth: 420 })

  // machine-readable lines, like the bottom of a real data page
  ctx.fillStyle = 'rgba(23,75,50,0.06)'
  roundedRect(ctx, rx - 10, 930, 690, 116, 10)
  ctx.fill()
  m.mrz.forEach((line, i) => {
    text(ctx, line, rx, 980 + i * 42, { size: 26, minSize: 18, weight: 700, color: COLOR.dark, family: MONO_STACK, maxWidth: 670 })
  })
  if (m.siteUrl) text(ctx, m.siteUrl, rx + 670, 1074, { size: 22, weight: 700, color: COLOR.primary, align: 'right', maxWidth: 400 })
}

/** Paint the passport spread. `images[i]` is the loaded image for stamps[i], or null for the fallback icon. `photo` is the optional holder photo (a canvas/bitmap). */
export function drawShareCard(ctx, m, images = [], photo = null) {
  drawSpreadFrame(ctx)

  // ---- right page: visa page with rubber stamps (like a real passport, the data page comes first on the left) ----
  const lx = 890
  ctx.strokeStyle = 'rgba(23,75,50,0.28)'
  ctx.lineWidth = 2
  roundedRect(ctx, 832, 62, 706, 1006, 10)
  ctx.stroke()
  ctx.lineWidth = 1
  roundedRect(ctx, 838, 68, 694, 994, 7)
  ctx.stroke()
  drawEmblem(ctx, 1185, 640, 430, 'rgba(23,75,50,0.05)')
  text(ctx, m.pageLabel, lx, 112, { size: 22, weight: 700, color: COLOR.muted, maxWidth: 300 })
  text(ctx, m.visaLabel, lx + 630, 112, { size: 26, weight: 700, color: COLOR.primary, align: 'right', maxWidth: 300 })
  text(ctx, m.stampsLabel, lx, 172, { size: 40, minSize: 28, weight: 700, color: COLOR.primary, maxWidth: 630 })
  if (m.stamps.length === 0) text(ctx, m.emptyText, lx, 214, { size: 24, color: COLOR.muted, maxWidth: 630 })
  ctx.fillStyle = 'rgba(23,75,50,0.35)'
  ctx.fillRect(lx, 232, 630, 2)
  const grid = stampGrid(m.stamps.length)
  // centre the block vertically when it needs fewer rows than its tier has room for
  const spareRows = grid.mode === 'full' ? grid.tierRows - Math.ceil(grid.slots / grid.cols) : 0
  const topOffset = (spareRows * grid.cellH) / 2
  for (let i = 0; i < grid.slots; i++) {
    const stamp = m.stamps[i]
    const jitter = (stamp?.tilt ?? 0) * grid.scale
    const x = GRID_AREA.x + (i % grid.cols + 0.5) * grid.cellW + (grid.mode === 'full' ? jitter * 3 : 0)
    const y = GRID_AREA.y + topOffset + (Math.floor(i / grid.cols) + 0.5) * grid.cellH - (grid.mode === 'full' ? jitter * 3 : 0)
    if (!stamp) drawSlot(ctx, x, y, m.stampHereLabel)
    else if (grid.mode === 'mini') drawMiniStamp(ctx, stamp, images?.[i] ?? null, x, y, Math.min(grid.cellW, grid.cellH) - 10)
    else drawStamp(ctx, stamp, images?.[i] ?? null, x, y, m.collectedLabel, 'FOOD PASSPORT', m.entryLabel, grid.scale)
  }
  text(ctx, m.selfReported, lx, 1040, { size: 22, color: COLOR.muted, maxWidth: 630 })

  drawDataPage(ctx, m, photo)
}

// ---------- browser rendering ----------

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

const sampleOf = (m) =>
  [m.brand, m.tagline, m.title, m.level.name, m.level.nextText, m.pageLabel, m.stampsLabel, m.collectedLabel, m.emptyText,
    m.selfReported, m.signatureLabel, m.visaLabel, m.stampHereLabel, ...m.details.flatMap((d) => [d.label, d.value]), ...m.badges, ...m.fields.flatMap((f) => [f.label, f.value]), ...m.stamps.flatMap((s) => [s.name, s.district ?? ''])].join(' ')

/**
 * Draw the card onto `canvas`. Image failures fall back to icons; font failures fall back to system fonts.
 * `isStale()` lets callers drop a draw that was superseded while it was waiting on fonts/images.
 */
export async function renderShareCard(canvas, model, { loadImageFn = loadImage, fontsApi = globalThis.document?.fonts, isStale = () => false, photo = null } = {}) {
  await ensureFonts(fontsApi, sampleOf(model))
  const images = await Promise.all(model.stamps.map((s) => (s.imageUrl ? loadImageFn(s.imageUrl) : null)))
  if (isStale()) return
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  drawShareCard(canvas.getContext('2d'), model, images, photo)
}
