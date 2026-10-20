import { createRecordingCtx } from '../test/recordingCtx'
import { MAX_PHOTO_BYTES, PHOTO_H, PHOTO_W, coverRect, processPhoto, validatePhotoFile } from './photo'

const file = (type, size = 1000) => ({ type, size, name: 'me' })

describe('validatePhotoFile', () => {
  test('accepts JPEG, PNG and WebP up to the size limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(validatePhotoFile(file(type))).toEqual({ ok: true })
    expect(validatePhotoFile(file('image/png', MAX_PHOTO_BYTES))).toEqual({ ok: true })
  })
  test('rejects other types, including SVG (can carry scripts) and non-images', () => {
    for (const type of ['image/svg+xml', 'application/pdf', 'text/html', '']) expect(validatePhotoFile(file(type))).toEqual({ ok: false, reason: 'type' })
    expect(validatePhotoFile(null)).toEqual({ ok: false, reason: 'type' })
  })
  test('rejects files over 10 MB and empty files', () => {
    expect(validatePhotoFile(file('image/jpeg', MAX_PHOTO_BYTES + 1))).toEqual({ ok: false, reason: 'size' })
    expect(validatePhotoFile(file('image/jpeg', 0))).toEqual({ ok: false, reason: 'type' })
  })
})

describe('coverRect (centre crop that fills the frame)', () => {
  const ratio = PHOTO_W / PHOTO_H
  test('a wide photo loses its sides, centred', () => {
    const r = coverRect(2000, 1000, PHOTO_W, PHOTO_H)
    expect(r.sh).toBe(1000)
    expect(r.sw / r.sh).toBeCloseTo(ratio, 3)
    expect(r.sx + r.sw / 2).toBeCloseTo(1000, 3)
    expect(r.sy).toBe(0)
  })
  test('a tall photo loses top and bottom, centred', () => {
    const r = coverRect(1000, 3000, PHOTO_W, PHOTO_H)
    expect(r.sw).toBe(1000)
    expect(r.sw / r.sh).toBeCloseTo(ratio, 3)
    expect(r.sy + r.sh / 2).toBeCloseTo(1500, 3)
    expect(r.sx).toBe(0)
  })
  test('a photo with the frame ratio is used whole', () => {
    expect(coverRect(720, 1000, PHOTO_W, PHOTO_H)).toEqual({ sx: 0, sy: 0, sw: 720, sh: 1000 })
  })
})

describe('processPhoto', () => {
  const setup = (w, h) => {
    const ctx = createRecordingCtx()
    const canvas = { width: 0, height: 0, getContext: () => ctx }
    const bitmap = { width: w, height: h, close: vi.fn() }
    return { ctx, canvas, bitmap, deps: { createBitmap: vi.fn().mockResolvedValue(bitmap), makeCanvas: () => canvas } }
  }
  test('re-draws the photo into a small frame-sized canvas (this also drops EXIF/location data) and frees the bitmap', async () => {
    const { ctx, canvas, bitmap, deps } = setup(4000, 3000)
    const out = await processPhoto(file('image/jpeg'), deps)
    expect(out).toBe(canvas)
    expect([canvas.width, canvas.height]).toEqual([PHOTO_W, PHOTO_H])
    const draw = ctx.calls.find((c) => c[0] === 'drawImage')
    expect(draw.slice(1, 6)).toEqual([bitmap, ...Object.values(coverRect(4000, 3000, PHOTO_W, PHOTO_H))])
    expect(draw.slice(6)).toEqual([0, 0, PHOTO_W, PHOTO_H])
    expect(bitmap.close).toHaveBeenCalled()
  })
  test('an undecodable image rejects with a read error', async () => {
    const deps = { createBitmap: vi.fn().mockRejectedValue(new Error('bad')), makeCanvas: () => ({}) }
    await expect(processPhoto(file('image/png'), deps)).rejects.toMatchObject({ reason: 'read' })
  })
  test('invalid files are rejected before decoding', async () => {
    const { deps } = setup(10, 10)
    await expect(processPhoto(file('image/svg+xml'), deps)).rejects.toMatchObject({ reason: 'type' })
    expect(deps.createBitmap).not.toHaveBeenCalled()
  })
})
