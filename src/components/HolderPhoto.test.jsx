import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { createRecordingCtx } from '../test/recordingCtx'
import { renderApp } from '../test/renderApp'

const bn = translations.bn
let ctx
beforeEach(() => {
  ctx = createRecordingCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, mime) => cb(new Blob(['x'], { type: mime ?? 'image/png' })))
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }))
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const photoDrawn = () => ctx.calls.some((c) => c[0] === 'drawImage' && c[1] instanceof HTMLCanvasElement)
const image = (type = 'image/jpeg', size = 2048) => {
  const f = new File(['x'], 'me.jpg', { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}
const open = async (opts) => {
  const r = await renderApp('#/passport', opts)
  await waitFor(() => expect(ctx.texts().join('|')).toContain(bn['share.stamps']))
  return r
}
const input = () => screen.getByLabelText(bn['photo.add'])

test('offers an optional photo field with a privacy note', async () => {
  await open()
  expect(input()).toHaveAttribute('type', 'file')
  expect(input()).toHaveAttribute('accept', expect.stringContaining('image/jpeg'))
  expect(screen.getByText(bn['photo.hint'])).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: bn['photo.remove'] })).toBeNull()
  expect(photoDrawn()).toBe(false)
})

test('a chosen photo is drawn on the card and can be removed', async () => {
  const { user } = await open()
  await user.upload(input(), image())
  await waitFor(() => expect(photoDrawn()).toBe(true))
  ctx.calls.length = 0
  await user.click(screen.getByRole('button', { name: bn['photo.remove'] }))
  await waitFor(() => expect(ctx.calls.length).toBeGreaterThan(0))
  expect(photoDrawn()).toBe(false)
  expect(screen.queryByRole('button', { name: bn['photo.remove'] })).toBeNull()
})

test('the photo also shows on the holder page of the passport book, and goes away on remove', async () => {
  const { user } = await open()
  const holder = () => screen.getByRole('region', { name: bn['book.dataPage'] })
  expect(within(holder()).queryByRole('img')).toBeNull()
  await user.upload(input(), image())
  const img = await within(holder()).findByRole('img', { name: bn['photo.alt'] })
  expect(img).toHaveAttribute('src', 'blob:photo')
  await user.click(screen.getByRole('button', { name: bn['photo.remove'] }))
  expect(within(holder()).queryByRole('img')).toBeNull()
})

test.each([
  ['a non-image', () => image('application/pdf'), 'photo.errorType'],
  ['an SVG', () => image('image/svg+xml'), 'photo.errorType'],
  ['a file over 10 MB', () => image('image/png', 11 * 1024 * 1024), 'photo.errorSize'],
])('rejects %s with a clear message and keeps the old state', async (_n, make, key) => {
  await open()
  // the picker's accept filter can be bypassed ("All files"), so the file is delivered directly
  fireEvent.change(input(), { target: { files: [make()] } })
  expect(await screen.findByRole('alert')).toHaveTextContent(bn[key])
  expect(photoDrawn()).toBe(false)
})

test('an unreadable image is reported', async () => {
  createImageBitmap.mockRejectedValue(new Error('bad'))
  const { user } = await open()
  await user.upload(input(), image())
  expect(await screen.findByRole('alert')).toHaveTextContent(bn['photo.errorRead'])
})

test('the photo stays in memory only: nothing about it reaches storage', async () => {
  const { user } = await open()
  await user.upload(input(), image())
  await waitFor(() => expect(photoDrawn()).toBe(true))
  expect(JSON.stringify({ ...localStorage })).not.toContain('blob:')
  expect(JSON.stringify({ ...localStorage })).not.toContain('data:image')
})

test('replacing the photo frees the previous object URL', async () => {
  const { user } = await open()
  await user.upload(input(), image())
  await screen.findByRole('button', { name: bn['photo.remove'] })
  await user.upload(input(), image('image/png'))
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo'))
})
