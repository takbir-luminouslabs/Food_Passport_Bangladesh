// Canvas drawing of the round seals and the page frame, shared by the PDF book and the share card.
import { paintIcon } from './stampIcons'
import { FONT_STACK, arcText, arcTextBottom, roundedRect, text } from './canvasKit'

export const COL_W = 630
export const PAGE_X = { left: 80, right: 890 }
const FRAME_X = { left: 62, right: 832 }

const isLatin = (s) => /^[\x20-\x7e]*$/.test(s)

/** The thin double rule that frames a page;  */
export function drawPageFrame(ctx, side) {
  const frameX = FRAME_X[side]
  ctx.strokeStyle = 'rgba(23,75,50,0.28)'
  ctx.lineWidth = 2
  roundedRect(ctx, frameX, 62, 706, 1006, 10)
  ctx.stroke()
  ctx.lineWidth = 1
  roundedRect(ctx, frameX + 6, 68, 694, 994, 7)
  ctx.stroke()
}

// ---------- seals ----------

/**
 * A round rubber seal centred on (cx, cy): rings, the food name on the top ring, the district on the bottom ring and
 * the category line-art in the middle. Latin text curves along the ring; Bengali is set straight inside it, because
 * placing it letter by letter would split the joined letters.
 */
/** The food photo, cover-fitted into a ring-edged circle at (x, y). */
function paintPhoto(ctx, img, x, y, pr, ink) {
  const w = img.naturalWidth || img.width || 1
  const h = img.naturalHeight || img.height || 1
  const k = Math.max((pr * 2) / w, (pr * 2) / h)
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, pr, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, x - (w * k) / 2, y - (h * k) / 2, w * k, h * k)
  ctx.restore()
  ctx.strokeStyle = ink
  ctx.lineWidth = pr * 0.07
  ctx.beginPath()
  ctx.arc(x, y, pr, 0, Math.PI * 2)
  ctx.stroke()
}

/** `img` is the optional food photo (a loaded image); without it the seal shows the category line-art. */
export function drawSeal(ctx, seal, cx, cy, r, tilt = 0, img = null) {
  const { name, district = '', category, ink } = seal
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((tilt * Math.PI) / 180)
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.07
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.lineWidth = r * 0.065
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = r * 0.02
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.89, 0, Math.PI * 2)
  ctx.stroke()

  if (isLatin(name) && isLatin(district)) {
    // shrink until the whole word fits on its arc, so letters never run into each other
    const fit = (str, radius, size, sweep) => {
      let s = size
      for (; s > r * 0.12; s -= 1) {
        ctx.font = `800 ${s}px ${FONT_STACK}`
        if ([...str].reduce((w, ch) => w + ctx.measureText(ch).width + 1.5, 0) <= radius * sweep) break
      }
      return s
    }
    arcText(ctx, name, r * 0.62, { size: fit(name, r * 0.62, r * 0.25, 4.1), weight: 800, color: ink })
    if (district) arcTextBottom(ctx, district, r * 0.74, { size: fit(district, r * 0.74, r * 0.2, 1.9), weight: 700, color: ink })
    if (img) paintPhoto(ctx, img, 0, 0, r * 0.46, ink)
    else paintIcon(ctx, category, 0, 0, r * 0.7, ink, 7)
  } else {
    // Bengali stays whole (placing it letter by letter would split the joined letters)
    if (img) paintPhoto(ctx, img, 0, r * 0.06, r * 0.38, ink)
    else paintIcon(ctx, category, 0, r * 0.06, r * 0.52, ink, 7)
    text(ctx, name, 0, -r * 0.42, { size: r * 0.24, minSize: r * 0.12, weight: 800, color: ink, align: 'center', maxWidth: r * 1.36 })
    if (district) text(ctx, district, 0, r * 0.74, { size: r * 0.19, minSize: r * 0.1, weight: 700, color: ink, align: 'center', maxWidth: r * 1.2 })
  }
  ctx.restore()
}

/** An empty place for a stamp: dashed ring with a lock, the food's name and district under it. */
export function drawLockedSeal(ctx, cx, cy, r, name, district = null) {
  ctx.save()
  ctx.strokeStyle = 'rgba(102,115,106,0.6)'
  ctx.lineWidth = 3
  ctx.setLineDash([5, 9])
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  paintIcon(ctx, 'lock', cx, cy, r * 0.55, 'rgba(102,115,106,0.8)', 6)
  text(ctx, name, cx, cy + r + 38, { size: 22, minSize: 13, weight: 700, color: 'rgba(102,115,106,0.95)', align: 'center', maxWidth: 200 })
  if (district) text(ctx, district, cx, cy + r + 64, { size: 18, minSize: 12, color: 'rgba(102,115,106,0.8)', align: 'center', maxWidth: 200 })
  ctx.restore()
}
