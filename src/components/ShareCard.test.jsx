import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { translations } from '../data/translations'
import { createRecordingCtx } from '../test/recordingCtx'
import { renderApp } from '../test/renderApp'

const bn = translations.bn
let ctx
let blobCb

beforeEach(() => {
  ctx = createRecordingCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx)
  blobCb = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['png-bytes'], { type: 'image/png' })))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete navigator.share
  delete navigator.canShare
})

const drawn = () => ctx.texts().join('|')

test('renders a preview of the card for the current passport', async () => {
  await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti', 'haleem'] } })
  expect(screen.getByRole('button', { name: bn['share.enlarge'] })).toBeInTheDocument()
  await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
  expect(drawn()).toContain('২/৭১')
  expect(drawn()).toContain('হালিম')
})

test('shows a generating message until the card is ready', async () => {
  await renderApp('#/passport')
  await waitFor(() => expect(screen.queryByText(bn['share.generating'])).toBeNull())
})

test('the optional name appears on the card and is not persisted', async () => {
  const { user } = await renderApp('#/passport')
  await user.type(screen.getByLabelText(bn['share.nameLabel']), 'রাফি')
  await waitFor(() => expect(drawn()).toContain('রাফি'))
  expect(ctx.texts().filter((t) => t === 'রাফি').length).toBeGreaterThan(0)
  expect(localStorage.getItem('food-passport-bangladesh:v1')).not.toContain('রাফি')
  expect(screen.getByText(bn['share.nameHint'])).toBeInTheDocument()
})

test('download produces a PNG file', async () => {
  const { user } = await renderApp('#/passport')
  await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
  const create = vi.fn(() => 'blob:png')
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await user.click(screen.getByRole('button', { name: bn['share.download'] }))
  expect(blobCb).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined)
  expect(create.mock.calls[0][0].type).toBe('image/png')
  expect(click).toHaveBeenCalled()
})

describe('download formats', () => {
  const setup = async () => {
    const { user } = await renderApp('#/passport')
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    const create = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
    blobCb.mockImplementation((cb, mime) => cb(new Blob(['x'], { type: mime ?? 'image/png' })))
    const anchors = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { anchors.push(this.download) })
    return { user, create, anchors }
  }
  const pick = (user, label) => user.click(screen.getByRole('radio', { name: label }))

  test('PNG, JPG, WebP and PDF are offered, PNG selected by default', async () => {
    await renderApp('#/passport')
    const group = screen.getByRole('radiogroup', { name: bn['share.format'] })
    expect(within(group).getAllByRole('radio').map((r) => r.value)).toEqual(['png', 'jpg', 'webp', 'pdf'])
    expect(within(group).getByRole('radio', { name: 'PNG' })).toBeChecked()
  })

  test('JPG downloads a .jpg file', async () => {
    const { user, create, anchors } = await setup()
    await pick(user, 'JPG')
    await user.click(screen.getByRole('button', { name: bn['share.download'] }))
    expect(blobCb).toHaveBeenLastCalledWith(expect.any(Function), 'image/jpeg', 0.92)
    expect(create.mock.calls[0][0].type).toBe('image/jpeg')
    expect(anchors).toEqual(['food-passport.jpg'])
  })

  test('WebP downloads a .webp file', async () => {
    const { user, anchors } = await setup()
    await pick(user, 'WebP')
    await user.click(screen.getByRole('button', { name: bn['share.download'] }))
    expect(anchors).toEqual(['food-passport.webp'])
  })

  test('PDF downloads a .pdf file', async () => {
    const { user, create, anchors } = await setup()
    await pick(user, 'PDF')
    await user.click(screen.getByRole('button', { name: bn['share.download'] }))
    await waitFor(() => expect(anchors).toEqual(['food-passport.pdf']))
    expect(create.mock.calls[0][0].type).toBe('application/pdf')
  })

  test('native share still sends a PNG whatever format is selected', async () => {
    const share = vi.fn().mockResolvedValue()
    navigator.share = share
    navigator.canShare = () => true
    const { user } = await setup()
    await pick(user, 'PDF')
    await user.click(screen.getByRole('button', { name: bn['share.native'] }))
    expect(share.mock.calls[0][0].files[0].type).toBe('image/png')
  })
})

test('a canvas failure shows an error and does not crash the page', async () => {
  HTMLCanvasElement.prototype.getContext.mockImplementation(() => {
    throw new Error('no canvas')
  })
  await renderApp('#/passport')
  expect(await screen.findByText(bn['share.error'])).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
})

test('an empty blob (export failure) is reported, not silently ignored', async () => {
  const { user } = await renderApp('#/passport')
  await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
  blobCb.mockImplementation((cb) => cb(null))
  await user.click(screen.getByRole('button', { name: bn['share.download'] }))
  expect(await screen.findByText(bn['share.error'])).toBeInTheDocument()
})

test('the Share button is always shown, even where native file sharing is missing', async () => {
  await renderApp('#/passport')
  expect(screen.getByRole('button', { name: bn['share.native'] })).toBeInTheDocument()
})

test('native share sends the PNG file when supported', async () => {
  const share = vi.fn().mockResolvedValue()
  navigator.share = share
  navigator.canShare = () => true
  const { user } = await renderApp('#/passport')
  await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
  await user.click(screen.getByRole('button', { name: bn['share.native'] }))
  const arg = share.mock.calls[0][0]
  expect(arg.files[0]).toBeInstanceOf(File)
  expect(arg.files[0].type).toBe('image/png')
})

describe('share menu (browsers without native file sharing)', () => {
  // user-event installs its own clipboard stub on setup, so browser features are stubbed after render, before the click
  const open = async (stub) => {
    const { user } = await renderApp('#/passport')
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    stub?.()
    await user.click(screen.getByRole('button', { name: bn['share.native'] }))
    return { user, menu: screen.getByRole('group', { name: bn['share.menu'] }) }
  }
  afterEach(() => {
    delete globalThis.ClipboardItem
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  })

  test('opens a menu with WhatsApp, Facebook and X links that open safely in a new tab', async () => {
    const { menu } = await open()
    for (const [label, host] of [[bn['share.whatsapp'], 'https://wa.me/'], [bn['share.facebook'], 'https://www.facebook.com/'], [bn['share.x'], 'https://twitter.com/']]) {
      const link = within(menu).getByRole('link', { name: label })
      expect(link.getAttribute('href').startsWith(host)).toBe(true)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
      expect(link.getAttribute('rel')).toContain('noreferrer')
    }
  })

  test('the shared message carries the stamp count and the site URL, never the typed name', async () => {
    const { user } = await renderApp('#/passport', { state: { triedFoodIds: ['chotpoti', 'haleem'] } })
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    await user.type(screen.getByLabelText(bn['share.nameLabel']), 'রাফি')
    await user.click(screen.getByRole('button', { name: bn['share.native'] }))
    const href = decodeURIComponent(screen.getByRole('link', { name: bn['share.whatsapp'] }).getAttribute('href'))
    expect(href).toContain('২টি')
    expect(href).toContain(window.location.origin)
    expect(href).not.toContain('রাফি')
    expect(href).not.toContain('#/passport')
  })

  test('copy image puts the PNG on the clipboard and says so', async () => {
    const write = vi.fn().mockResolvedValue()
    const { user, menu } = await open(() => {
      globalThis.ClipboardItem = class { constructor(items) { this.items = items } }
      Object.defineProperty(navigator, 'clipboard', { value: { write, writeText: vi.fn() }, configurable: true })
    })
    await user.click(within(menu).getByRole('button', { name: bn['share.copyImage'] }))
    expect(write).toHaveBeenCalledTimes(1)
    expect(await write.mock.calls[0][0][0].items['image/png']).toBeInstanceOf(Blob)
    expect(await screen.findByText(bn['share.copied'])).toBeInTheDocument()
  })

  test('copy image is not offered where the browser cannot write images to the clipboard', async () => {
    const { menu } = await open(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn() }, configurable: true }))
    expect(within(menu).queryByRole('button', { name: bn['share.copyImage'] })).toBeNull()
  })

  test('a clipboard failure is reported, not ignored', async () => {
    const { user, menu } = await open(() => {
      globalThis.ClipboardItem = class { constructor(items) { this.items = items } }
      Object.defineProperty(navigator, 'clipboard', { value: { write: vi.fn().mockRejectedValue(new Error('denied')), writeText: vi.fn() }, configurable: true })
    })
    await user.click(within(menu).getByRole('button', { name: bn['share.copyImage'] }))
    expect(await screen.findByText(bn['share.copyFailed'])).toBeInTheDocument()
  })

  test('copy link writes the site URL', async () => {
    const writeText = vi.fn().mockResolvedValue()
    const { user, menu } = await open(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true }))
    await user.click(within(menu).getByRole('button', { name: bn['share.copyLink'] }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(window.location.origin))
    expect(await screen.findByText(bn['share.linkCopied'])).toBeInTheDocument()
  })

  test('Escape closes the menu and returns focus to the Share button', async () => {
    const { user } = await open()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: bn['share.menu'] })).toBeNull()
    expect(screen.getByRole('button', { name: bn['share.native'] })).toHaveFocus()
  })

  test('the Share button reports its expanded state', async () => {
    const { user } = await renderApp('#/passport')
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    const btn = screen.getByRole('button', { name: bn['share.native'] })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  test('where native sharing exists, Share uses it and no menu opens', async () => {
    navigator.share = vi.fn().mockResolvedValue()
    navigator.canShare = () => true
    const { user } = await renderApp('#/passport')
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    await user.click(screen.getByRole('button', { name: bn['share.native'] }))
    expect(navigator.share).toHaveBeenCalled()
    expect(screen.queryByRole('group', { name: bn['share.menu'] })).toBeNull()
  })
})

describe('float to enlarge', () => {
  const stubUrl = () => {
    const create = vi.fn(() => 'blob:card-1')
    const revoke = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }))
    return { create, revoke }
  }

  test('clicking the preview floats the card up as a real image you can long-press to save', async () => {
    const { user } = await renderApp('#/passport')
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    const { create } = stubUrl()
    await user.click(screen.getByRole('button', { name: bn['share.enlarge'] }))
    const dialog = screen.getByRole('dialog', { name: bn['share.cardAlt'] })
    const img = within(dialog).getByRole('img', { name: bn['share.cardAlt'] })
    expect(img).toHaveAttribute('src', 'blob:card-1')
    expect(create.mock.calls[0][0].type).toBe('image/png')
    expect(within(dialog).getByText(bn['share.saveHint'])).toBeInTheDocument()
  })

  test('Esc closes it, returns focus and frees the temporary image URL', async () => {
    const { user } = await renderApp('#/passport')
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    const { revoke } = stubUrl()
    const opener = screen.getByRole('button', { name: bn['share.enlarge'] })
    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(revoke).toHaveBeenCalledWith('blob:card-1')
    expect(opener).toHaveFocus()
  })

  test('if the PNG cannot be produced, an error is shown instead of an empty dialog', async () => {
    const { user } = await renderApp('#/passport')
    await waitFor(() => expect(drawn()).toContain(bn['share.stamps']))
    stubUrl()
    blobCb.mockImplementation((cb) => cb(null))
    await user.click(screen.getByRole('button', { name: bn['share.enlarge'] }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText(bn['share.error'])).toBeInTheDocument()
  })
})

test('the home page links to the share section', async () => {
  await renderApp('#/')
  expect(screen.getByRole('link', { name: bn['share.passport'] })).toHaveAttribute('href', '#/passport#share')
})
