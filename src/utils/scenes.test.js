import { createRecordingCtx } from '../test/recordingCtx'
import { SCENE_IDS, paintScene, sceneSvg } from './scenes'

test('there is a riverside scene and a skyline scene', () => {
  expect([...SCENE_IDS].sort()).toEqual(['river', 'skyline'])
})

test('each scene has valid path data inside its own viewBox', () => {
  for (const id of SCENE_IDS) {
    const { w, h, d } = sceneSvg(id)
    expect(d, id).toMatch(/^M[-\d. MLQCAZ,]+$/)
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number)
    expect(Math.min(...nums), id).toBeGreaterThanOrEqual(-1)
    expect(Math.max(...nums), id).toBeLessThanOrEqual(Math.max(w, h) + 1)
    expect(w / h).toBeGreaterThan(2)
  }
})

test('a scene paints on a canvas at the requested width and colour, with no text', () => {
  for (const id of SCENE_IDS) {
    const ctx = createRecordingCtx()
    const { w } = sceneSvg(id)
    paintScene(ctx, id, 100, 200, 600, '#174B32')
    expect(ctx.calls.some((c) => c[0] === 'stroke'), id).toBe(true)
    expect(ctx.calls.find((c) => c[0] === 'translate')).toEqual(['translate', 100, 200])
    expect(ctx.calls.find((c) => c[0] === 'scale')).toEqual(['scale', 600 / w, 600 / w])
    expect(ctx.texts()).toHaveLength(0)
  }
})
