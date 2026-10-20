import { EXPORT_FORMATS, buildPdf, buildPdfPages, exportCard } from './exportFormats'

const fakeCanvas = (typeFor = (mime) => mime) => ({
  width: 1600,
  height: 1130,
  toBlob: vi.fn((cb, mime) => cb(new Blob([new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])], { type: typeFor(mime) }))),
})
const readBytes = (blob) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = () => resolve(new Uint8Array(reader.result))
  reader.readAsArrayBuffer(blob)
})
const text = async (blob) => new TextDecoder('latin1').decode(await readBytes(blob))

test('offers PNG, JPG, WebP and PDF, PNG first', () => {
  expect(EXPORT_FORMATS.map((f) => f.id)).toEqual(['png', 'jpg', 'webp', 'pdf'])
})

describe('image formats', () => {
  test.each([['png', 'image/png', undefined], ['jpg', 'image/jpeg', 0.92], ['webp', 'image/webp', 0.92]])('%s uses the right mime type and quality', async (id, mime, quality) => {
    const canvas = fakeCanvas()
    const { blob, filename } = await exportCard(canvas, id)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), mime, quality)
    expect(blob.type).toBe(mime)
    expect(filename).toBe(`food-passport.${id}`)
  })

  test('if the browser cannot encode WebP and hands back a PNG, the file is named .png', async () => {
    const { filename, blob } = await exportCard(fakeCanvas(() => 'image/png'), 'webp')
    expect(blob.type).toBe('image/png')
    expect(filename).toBe('food-passport.png')
  })

  test('an encoding failure (null blob) is reported to the caller as null', async () => {
    const canvas = { width: 10, height: 10, toBlob: (cb) => cb(null) }
    expect(await exportCard(canvas, 'jpg')).toBeNull()
    expect(await exportCard(canvas, 'pdf')).toBeNull()
  })
})

describe('PDF', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 9, 8, 7, 6, 0xff, 0xd9])
  const pdfText = (bytes) => new TextDecoder('latin1').decode(bytes)

  test('is a one-page landscape PDF embedding the JPEG as-is', () => {
    const bytes = buildPdf(jpeg, 1600, 1130)
    const s = pdfText(bytes)
    expect(s.startsWith('%PDF-1.4')).toBe(true)
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(s).toContain('/MediaBox[0 0 842 595]')
    expect(s).toContain('/Filter/DCTDecode')
    expect(s).toContain('/Width 1600/Height 1130')
    const at = s.indexOf('stream\n') + 7
    expect([...bytes.slice(at, at + jpeg.length)]).toEqual([...jpeg])
  })

  test('xref offsets point at the objects they describe', () => {
    const s = pdfText(buildPdf(jpeg, 1600, 1130))
    const xrefAt = Number(s.match(/startxref\n(\d+)/)[1])
    expect(s.slice(xrefAt, xrefAt + 4)).toBe('xref')
    const offsets = [...s.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
    expect(offsets).toHaveLength(5)
    offsets.forEach((off, i) => expect(s.slice(off, off + 7)).toBe(`${i + 1} 0 obj`))
  })

  test('the card is scaled to fit the page without stretching', () => {
    const s = pdfText(buildPdf(jpeg, 1600, 1130))
    const [, a, d, x, y] = s.match(/q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm/)
    expect(Number(a) / Number(d)).toBeCloseTo(1600 / 1130, 2)
    expect(Number(a)).toBeLessThanOrEqual(842)
    expect(Number(d)).toBeLessThanOrEqual(595)
    expect(Number(x)).toBeGreaterThanOrEqual(0)
    expect(Number(y)).toBeGreaterThanOrEqual(0)
  })

  test('exportCard builds a PDF blob from a JPEG render', async () => {
    const canvas = fakeCanvas()
    const { blob, filename } = await exportCard(canvas, 'pdf')
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.95)
    expect(blob.type).toBe('application/pdf')
    expect(filename).toBe('food-passport.pdf')
    expect((await text(blob)).startsWith('%PDF-1.4')).toBe(true)
  })
})

describe('multi-page PDF', () => {
  const jpeg = (n) => new Uint8Array([0xff, 0xd8, n, n, n, 0xff, 0xd9])
  const asText = (bytes) => new TextDecoder('latin1').decode(bytes)
  const pages = [1, 2, 3].map((n) => ({ jpeg: jpeg(n), width: 1600, height: 1130 }))

  test('has one page object per card image and the right page count', () => {
    const s = asText(buildPdfPages(pages))
    expect(s).toContain('/Count 3')
    expect(s).toContain('/Kids[3 0 R 6 0 R 9 0 R]')
    expect(s.match(/\/Subtype\/Image/g)).toHaveLength(3)
    expect(s.match(/\/Type\/Page\//g)).toHaveLength(3)
  })

  test('each page embeds its own image bytes, in order', () => {
    const bytes = buildPdfPages(pages)
    const s = asText(bytes)
    const found = [...s.matchAll(/stream\n/g)].map((m) => m.index + 7).filter((at) => bytes[at] === 0xff && bytes[at + 1] === 0xd8)
    expect(found.map((at) => bytes[at + 2])).toEqual([1, 2, 3])
  })

  test('xref lists every object with correct offsets', () => {
    const s = asText(buildPdfPages(pages))
    const xrefAt = Number(s.match(/startxref\n(\d+)/)[1])
    expect(s.slice(xrefAt, xrefAt + 10)).toBe('xref\n0 12\n')
    const offsets = [...s.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
    expect(offsets).toHaveLength(11)
    offsets.forEach((off, i) => expect(s.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`))
    expect(s).toContain('/Size 12')
  })

  test('a single page stays identical to buildPdf', () => {
    const one = [{ jpeg: jpeg(7), width: 1600, height: 1130 }]
    expect(asText(buildPdfPages(one))).toBe(asText(buildPdf(jpeg(7), 1600, 1130)))
  })

  test('refuses an empty document', () => {
    expect(() => buildPdfPages([])).toThrow()
  })
})
