import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { createRecordingCtx } from '../test/recordingCtx'
import { readFileSync } from 'node:fs'
import { renderApp } from '../test/renderApp'
import { buildBookPages } from '../utils/bookPages'
import { buildCollections } from '../utils/collections'

const bn = translations.bn
const foods = JSON.parse(readFileSync('public/data/foods.json', 'utf8'))
const categories = JSON.parse(readFileSync('public/data/categories.json', 'utf8'))
const SHEETS = 1 + Math.ceil(buildBookPages(buildCollections(foods, categories)).length / 2) // the cover, then a sheet per spread
let ctx
let anchors
let created
beforeEach(() => {
  ctx = createRecordingCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, mime) => cb(new Blob([new Uint8Array([0xff, 0xd8, 1, 0xff, 0xd9])], { type: mime ?? 'image/png' })))
  created = vi.fn(() => 'blob:pdf')
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() }))
  anchors = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { anchors.push(this.download) })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const open = async (opts) => {
  const r = await renderApp('#/passport', opts)
  await waitFor(() => expect(ctx.texts().join('|')).toContain(bn['share.stamps']))
  return r
}
const pdfButton = () => screen.getByRole('button', { name: bn['book.pdf'] })

test('the Stamps section offers a PDF download of the whole passport', async () => {
  await open()
  expect(pdfButton()).toBeEnabled()
})

test('downloads a multi-page PDF, showing progress while it is prepared', async () => {
  const { user } = await open({ state: { triedFoodIds: ['dinajpur-katarivog', 'haleem'] } })
  await user.click(pdfButton())
  await waitFor(() => expect(anchors).toContain('food-passport-book.pdf'))
  const blob = created.mock.calls.at(-1)[0]
  expect(blob.type).toBe('application/pdf')
  expect(await screen.findByText(bn['book.pdfDone'])).toBeInTheDocument()
})

test('shows which page is being prepared and blocks a second click meanwhile', async () => {
  const { user } = await open()
  let release
  HTMLCanvasElement.prototype.toBlob.mockImplementation((cb, mime) => {
    release = () => cb(new Blob([new Uint8Array([0xff, 0xd8, 1, 0xff, 0xd9])], { type: mime }))
  })
  await user.click(pdfButton())
  expect(await screen.findByText(bn['book.pdfBusy'].replace('{n}', '১').replace('{total}', new Intl.NumberFormat('bn-BD').format(SHEETS)))).toBeInTheDocument()
  expect(pdfButton()).toBeDisabled()
  HTMLCanvasElement.prototype.toBlob.mockImplementation((cb, mime) => cb(new Blob([new Uint8Array([0xff, 0xd8, 1, 0xff, 0xd9])], { type: mime })))
  release()
  await waitFor(() => expect(anchors).toContain('food-passport-book.pdf'))
  await waitFor(() => expect(pdfButton()).toBeEnabled())
})

test('an encoding failure shows an error and leaves the button usable', async () => {
  const { user } = await open()
  HTMLCanvasElement.prototype.toBlob.mockImplementation((cb) => cb(null))
  await user.click(pdfButton())
  expect(await screen.findByRole('alert')).toHaveTextContent(bn['book.pdfError'])
  expect(pdfButton()).toBeEnabled()
  expect(anchors).not.toContain('food-passport-book.pdf')
})

test('the name typed on the share card appears on the PDF cover', async () => {
  const { user } = await open()
  await user.type(screen.getByLabelText(bn['share.nameLabel']), 'রাফি আহমেদ')
  ctx.calls.length = 0
  await user.click(pdfButton())
  await waitFor(() => expect(anchors).toContain('food-passport-book.pdf'))
  expect(ctx.texts()).toContain('রাফি আহমেদ')
})

test('the PDF button sits with the book, not the share card', async () => {
  await open()
  const book = screen.getByRole('group', { name: bn['book.label'] })
  expect(within(book).getByRole('button', { name: bn['book.pdf'] })).toBeInTheDocument()
})
