export const PHOTO_W = 360
export const PHOTO_H = 500 // same portrait ratio as the passport photo frame (230x320)
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** SVG is excluded on purpose (it can carry scripts). Empty files are treated as unusable. */
export function validatePhotoFile(file) {
  if (!file || !ALLOWED.has(file.type) || file.size === 0) return { ok: false, reason: 'type' }
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, reason: 'size' }
  return { ok: true }
}

/** Source rectangle that fills a dw x dh frame by cropping the middle of the image. */
export function coverRect(sw, sh, dw, dh) {
  const frame = dw / dh
  if (sw / sh > frame) {
    const w = sh * frame
    return { sx: (sw - w) / 2, sy: 0, sw: w, sh }
  }
  const h = sw / frame
  return { sx: 0, sy: (sh - h) / 2, sw, sh: h }
}

const fail = (reason) => Object.assign(new Error(`photo: ${reason}`), { reason })

/**
 * Decode a chosen image in the browser and redraw it, centre-cropped, onto a small canvas. Re-drawing is what
 * removes EXIF data such as GPS location. Nothing is uploaded or stored.
 */
export async function processPhoto(
  file,
  { createBitmap = (f) => createImageBitmap(f), makeCanvas = () => document.createElement('canvas') } = {},
) {
  const check = validatePhotoFile(file)
  if (!check.ok) throw fail(check.reason)
  let bitmap
  try {
    bitmap = await createBitmap(file)
  } catch {
    throw fail('read')
  }
  try {
    const canvas = makeCanvas()
    canvas.width = PHOTO_W
    canvas.height = PHOTO_H
    const { sx, sy, sw, sh } = coverRect(bitmap.width, bitmap.height, PHOTO_W, PHOTO_H)
    canvas.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, PHOTO_W, PHOTO_H)
    return canvas
  } finally {
    bitmap.close?.()
  }
}
