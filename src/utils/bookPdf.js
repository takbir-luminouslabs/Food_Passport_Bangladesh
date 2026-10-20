import { blobBytes, buildPdfPages } from './exportFormats'
import { PAGE_X, drawLockedSeal, drawPageFrame, drawSeal } from './bookArt'
import {
  CARD_HEIGHT, CARD_WIDTH, COLOR, MONO_STACK, drawEmblem, drawSpreadFrame, ensureFonts, loadStampImages, roundedRect, text,
} from './canvasKit'
import { drawDataPage } from './shareCard'

export const BOOK_FILENAME = 'food-passport-book.pdf'

// Where the seals sit on a visa page: three columns and two rows inside the 630px-wide content column.
const ROW_Y = [455, 805]
const COL_W = 210
const SEAL_R = 92

/** A visa page: header, collection progress, six places for round seals (inked or still locked), MRZ line. */
function drawVisaPage(ctx, card, page, side, images = null) {
  const x = PAGE_X[side]
  drawPageFrame(ctx, side)
  drawEmblem(ctx, x - 18 + 353, 640, 430, 'rgba(23,75,50,0.05)')

  text(ctx, page.pageLabel, x, 112, { size: 22, weight: 700, color: COLOR.muted, maxWidth: 300 })
  text(ctx, card.visaLabel, x + 630, 112, { size: 26, weight: 700, color: COLOR.primary, align: 'right', maxWidth: 300 })
  text(ctx, page.title, x, 172, { size: 38, minSize: 24, weight: 700, color: COLOR.primary, maxWidth: 630 })
  text(ctx, page.statLine, x, 214, { size: 24, weight: 700, color: COLOR.muted, maxWidth: 630 })
  ctx.fillStyle = '#DDE3DA'
  roundedRect(ctx, x, 228, 630, 14, 7)
  ctx.fill()
  if (page.percent > 0) {
    ctx.fillStyle = COLOR.primary
    roundedRect(ctx, x, 228, Math.max(14, (630 * page.percent) / 100), 14, 7)
    ctx.fill()
  }

  page.slots.forEach((slot, i) => {
    const cx = x + ((i % 3) + 0.5) * COL_W
    const cy = ROW_Y[Math.floor(i / 3)]
    if (slot.state === 'collected') drawSeal(ctx, slot.stamp, cx, cy, SEAL_R, slot.stamp.tilt, images?.get?.(slot.stamp.imageUrl))
    else drawLockedSeal(ctx, cx, cy, SEAL_R, slot.name, slot.district)
  })

  text(ctx, page.mrz, x, 1040, { size: 20, weight: 700, color: 'rgba(102,115,106,0.8)', family: MONO_STACK, maxWidth: 630 })
}

/** The closed passport: green leather, gold emblem and title, the holder's name if they gave one. */
function drawCover(ctx, sheet) {
  const W = CARD_WIDTH
  const H = CARD_HEIGHT
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#10251C')
  bg.addColorStop(1, '#0A1812')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const x = 450
  const y = 55
  const w = 700
  const h = 1020
  const leather = ctx.createLinearGradient(x, y, x + w, y + h)
  leather.addColorStop(0, COLOR.leather)
  leather.addColorStop(0.5, COLOR.primary)
  leather.addColorStop(1, COLOR.dark)
  ctx.fillStyle = leather
  roundedRect(ctx, x, y, w, h, 28)
  ctx.fill()
  ctx.strokeStyle = 'rgba(214,173,87,0.7)'
  ctx.lineWidth = 3
  ctx.setLineDash([14, 10])
  roundedRect(ctx, x + 26, y + 26, w - 52, h - 52, 18)
  ctx.stroke()
  ctx.setLineDash([])

  const cx = x + w / 2
  text(ctx, 'PASSPORT', cx, y + 150, { size: 30, weight: 700, color: '#E3C06F', align: 'center', maxWidth: 500 })
  drawEmblem(ctx, cx, y + 440, 360, '#E3C06F')
  text(ctx, sheet.brand, cx, y + 740, { size: 52, minSize: 30, weight: 700, color: '#E3C06F', align: 'center', maxWidth: w - 100 })
  text(ctx, sheet.tagline, cx, y + 800, { size: 24, minSize: 16, color: 'rgba(246,227,174,0.85)', align: 'center', maxWidth: w - 100 })
  if (sheet.holder) text(ctx, sheet.holder, cx, y + 910, { size: 34, minSize: 20, weight: 700, color: '#F6E3AE', align: 'center', maxWidth: w - 120 })
}

/** Draw sheet `index` of the book model (0 = cover) onto a 1600x1130 context. */
export function drawBookSheet(ctx, model, index, { photo = null, images = null } = {}) {
  const sheet = model.sheets[index]
  if (sheet.type === 'cover') return drawCover(ctx, sheet)
  drawSpreadFrame(ctx)
  const draw = (page, side) => {
    if (!page) return
    if (page.type === 'data') drawDataPage(ctx, model.card, photo)
    else drawVisaPage(ctx, model.card, page, side, images)
  }
  draw(sheet.left, 'left')
  draw(sheet.right, 'right')
  return undefined
}

const toBlob = (canvas, mime, quality) => new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
const tick = () => new Promise((resolve) => setTimeout(resolve, 0)) // let the page repaint between sheets

/**
 * Render every sheet and assemble the PDF. Pages are drawn one at a time on a single canvas (so memory stays small),
 * `onProgress(done, total)` fires after each, and `signal` can cancel between pages.
 */
export async function renderBook(
  model,
  { photo = null, onProgress, signal, fontsApi = globalThis.document?.fonts, makeCanvas = () => document.createElement('canvas') } = {},
) {
  await ensureFonts(fontsApi, model.sampleText)
  const urls = model.sheets.flatMap((sh) => [sh.left, sh.right]).flatMap((pg) => (pg?.slots ?? []).filter((sl) => sl.state === 'collected').map((sl) => sl.stamp.imageUrl))
  const images = await loadStampImages(urls)

  const canvas = makeCanvas()
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const pages = []
  for (let i = 0; i < model.sheets.length; i++) {
    if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
    drawBookSheet(canvas.getContext('2d'), model, i, { photo, images })
    const blob = await toBlob(canvas, 'image/jpeg', 0.9)
    if (!blob) throw new Error('Could not encode a page')
    pages.push({ jpeg: await blobBytes(blob), width: CARD_WIDTH, height: CARD_HEIGHT })
    onProgress?.(i + 1, model.sheets.length)
    await tick()
  }
  if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
  return { blob: new Blob([buildPdfPages(pages)], { type: 'application/pdf' }), filename: BOOK_FILENAME }
}
