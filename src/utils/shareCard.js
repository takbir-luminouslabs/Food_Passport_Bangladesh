import { formatNumber, pick, t } from './i18n'
import { INKS, mrzLine, stampStyle } from './passportStyle'
import { paintIcon } from './stampIcons'
import { PAGE_X, drawLockedSeal, drawPageFrame, drawSeal } from './bookArt'
import { percentTried } from './percent'
import {
  CARD_HEIGHT, CARD_WIDTH, COLOR, FONT_STACK, MONO_STACK, drawEmblem, drawSpreadFrame, ensureFonts, loadStampImages, roundedRect, text,
} from './canvasKit'

export * from './canvasKit'

const MAX_NAME = 30
const MAX_BADGES = 3


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
  const total = content.foods.length
  const percent = percentTried(progress.triedCount, total)
  const earned = new Set(progress.earnedBadgeIds)
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
      { label: t(lang, 'book.percentLabel'), value: `${formatNumber(percent, lang)}%` },
      { label: t(lang, 'passport.stamps'), value: `${formatNumber(progress.triedCount, lang)}/${formatNumber(total, lang)}` },
      { label: t(lang, 'share.field.issued'), value: formatDate(now, lang) },
    ],
    percent: {
      ratio: percent / 100,
      text: t(lang, 'book.percentOf', { tried: formatNumber(progress.triedCount, lang), total: formatNumber(total, lang) }),
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
      mrzLine(`${progress.triedCount}<${total}<${percent}<<${compactDate(now)}`),
    ],
  }
}

// ---------- drawing (works on any CanvasRenderingContext2D-compatible context) ----------

// Page area for stamps, and the tiers that keep every collected stamp on the card.
const GRID_AREA = { x: 890, y: 250, w: 630, h: 740 }
const SEAL_RADIUS = 92 // the size the seal art is designed at; other sizes scale from it
const MAX_SEAL = 130
const MAX_FULL = 30

/**
 * Layout for `count` stamps. Few stamps get big seals and more stamps shrink them, so every collected stamp stays on
 * the card: the column count that gives the largest seal wins (ties go to more columns). An empty passport shows six
 * guide slots. Beyond 30 stamps the card switches to compact icon badges.
 */
export function stampGrid(count) {
  if (count === 0) {
    // six empty guide slots: each is a seal with its "stamp here" label underneath, so keep them roomy
    return { mode: 'full', cols: 3, rows: 2, cellW: GRID_AREA.w / 3, cellH: GRID_AREA.h / 2, r: SEAL_RADIUS, scale: 1, slots: 6 }
  }
  if (count <= MAX_FULL) {
    const slots = count
    let best = null
    for (let cols = 1; cols <= 6; cols++) {
      const rows = Math.ceil(slots / cols)
      const cellW = GRID_AREA.w / cols
      const cellH = GRID_AREA.h / rows
      const r = Math.min(MAX_SEAL, Math.min(cellW, cellH) * 0.45)
      if (!best || r >= best.r - 0.001) best = { cols, rows, cellW, cellH, r }
    }
    return { mode: 'full', ...best, scale: best.r / SEAL_RADIUS, slots }
  }
  const cols = 9
  const rows = Math.ceil(count / cols)
  return { mode: 'mini', cols, rows, scale: 1, cellW: GRID_AREA.w / cols, cellH: Math.min(80, GRID_AREA.h / rows), slots: count }
}

/** A compact seal for crowded cards: the ring and the category line-art only. */
function drawMiniSeal(ctx, stamp, x, y, size) {
  const ink = stamp.ink || COLOR.ink
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(((stamp.tilt ?? 0) * Math.PI) / 180)
  ctx.strokeStyle = ink
  ctx.lineWidth = size * 0.07
  ctx.beginPath()
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
  ctx.stroke()
  paintIcon(ctx, stamp.category, 0, 0, size * 0.55, ink, 8)
  ctx.restore()
}

/** The holder data page (left page): brand, photo frame, details, "foods tried" bar, badges, signature and MRZ lines. */
export function drawDataPage(ctx, m, photo = null) {
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
    const y = 215 + i * 78
    text(ctx, f.label.toUpperCase(), rx + 270, y + 16, { size: 18, color: COLOR.muted, maxWidth: 400 })
    text(ctx, f.value, rx + 270, y + 56, { size: 34, minSize: 18, weight: 700, color: COLOR.dark, maxWidth: 400 })
  })

  // how much of Bangladesh was tried
  ctx.fillStyle = '#DDE3DA'
  roundedRect(ctx, rx, 590, 670, 22, 11)
  ctx.fill()
  const fill = Math.max(0, Math.min(1, Number.isFinite(m.percent.ratio) ? m.percent.ratio : 0))
  if (fill > 0) {
    ctx.fillStyle = COLOR.primary
    roundedRect(ctx, rx, 590, Math.max(22, 670 * fill), 22, 11)
    ctx.fill()
  }
  text(ctx, m.percent.text, rx, 646, { size: 22, color: COLOR.muted, maxWidth: 670 })

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

/**
 * Paint the passport spread: the data page on the left, the stamps page (round seals) on the right.
 * `photo` is the optional holder photo (a canvas/bitmap). `images` maps a photo URL to its loaded image.
 */
export function drawShareCard(ctx, m, images = null, photo = null) {
  drawSpreadFrame(ctx)
  drawDataPage(ctx, m, photo)

  const lx = PAGE_X.right
  drawPageFrame(ctx, 'right')
  drawEmblem(ctx, 1185, 640, 430, 'rgba(23,75,50,0.05)')
  text(ctx, m.pageLabel, lx, 112, { size: 22, weight: 700, color: COLOR.muted, maxWidth: 300 })
  text(ctx, m.visaLabel, lx + 630, 112, { size: 26, weight: 700, color: COLOR.primary, align: 'right', maxWidth: 300 })
  text(ctx, m.stampsLabel, lx, 172, { size: 40, minSize: 28, weight: 700, color: COLOR.primary, maxWidth: 630 })
  if (m.stamps.length === 0) text(ctx, m.emptyText, lx, 214, { size: 24, color: COLOR.muted, maxWidth: 630 })
  ctx.fillStyle = 'rgba(23,75,50,0.35)'
  ctx.fillRect(lx, 232, 630, 2)
  const grid = stampGrid(m.stamps.length)
  // centre the block vertically, and a last row with fewer seals horizontally
  const topOffset = grid.mode === 'full' ? (GRID_AREA.h - grid.rows * grid.cellH) / 2 : 0
  for (let i = 0; i < grid.slots; i++) {
    const stamp = m.stamps[i]
    const row = Math.floor(i / grid.cols)
    const inRow = Math.min(grid.cols, grid.slots - row * grid.cols)
    const rowShift = grid.mode === 'full' ? ((grid.cols - inRow) * grid.cellW) / 2 : 0
    const jitter = (stamp?.tilt ?? 0) * grid.scale
    const x = GRID_AREA.x + rowShift + (i % grid.cols + 0.5) * grid.cellW + (grid.mode === 'full' ? jitter * 1.5 : 0)
    const y = GRID_AREA.y + topOffset + (row + 0.5) * grid.cellH - (grid.mode === 'full' ? jitter * 2 : 0)
    if (!stamp) drawLockedSeal(ctx, x, y - 20 * grid.scale, grid.r, m.stampHereLabel)
    else if (grid.mode === 'mini') drawMiniSeal(ctx, stamp, x, y, Math.min(grid.cellW, grid.cellH) - 10)
    else drawSeal(ctx, stamp, x, y, grid.r, stamp.tilt, images?.get?.(stamp.imageUrl))
  }
  text(ctx, m.selfReported, lx, 1040, { size: 22, color: COLOR.muted, maxWidth: 630 })
}

// ---------- browser rendering ----------

const sampleOf = (m) =>
  [m.brand, m.tagline, m.title, m.percent.text, m.pageLabel, m.stampsLabel, m.collectedLabel, m.emptyText,
    m.selfReported, m.signatureLabel, m.visaLabel, m.stampHereLabel, ...m.details.flatMap((d) => [d.label, d.value]), ...m.badges,
    ...m.fields.flatMap((f) => [f.label, f.value]), ...m.stamps.flatMap((st) => [st.name, st.district ?? ''])].join(' ')

/**
 * Draw the card onto `canvas`. Font failures fall back to system fonts.
 * `isStale()` lets callers drop a draw that was superseded while it was waiting on fonts.
 */
export async function renderShareCard(canvas, model, { fontsApi = globalThis.document?.fonts, isStale = () => false, photo = null } = {}) {
  await ensureFonts(fontsApi, sampleOf(model))
  if (isStale()) return
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const images = await loadStampImages(model.stamps.map((s) => s.imageUrl))
  if (isStale()) return
  drawShareCard(canvas.getContext('2d'), model, images, photo)
}
