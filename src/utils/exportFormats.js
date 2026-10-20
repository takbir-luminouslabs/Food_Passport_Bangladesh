const BASE_NAME = 'food-passport'
const JPEG_QUALITY = 0.92

export const EXPORT_FORMATS = [
  { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
  { id: 'jpg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg', quality: JPEG_QUALITY },
  { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', quality: JPEG_QUALITY },
  { id: 'pdf', label: 'PDF', mime: 'application/pdf', ext: 'pdf' },
]
const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

const encode = (str) => new TextEncoder().encode(str)
const toBlob = (canvas, mime, quality) => new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
export const blobBytes = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(new Uint8Array(reader.result))
  reader.onerror = reject
  reader.readAsArrayBuffer(blob)
})

const PAGE_W = 842 // A4 landscape in points
const PAGE_H = 595

/** Place one JPEG on an A4-landscape page, scaled to fit and centred. */
const pageContent = (width, height) => {
  const scale = Math.min(PAGE_W / width, PAGE_H / height)
  const w = +(width * scale).toFixed(2)
  const h = +(height * scale).toFixed(2)
  const x = +((PAGE_W - w) / 2).toFixed(2)
  const y = +((PAGE_H - h) / 2).toFixed(2)
  return `q ${w} 0 0 ${h} ${x} ${y} cm /Im0 Do Q`
}

/**
 * PDF with one A4-landscape page per JPEG ({ jpeg, width, height }), each embedded untouched (DCTDecode),
 * scaled to fit and centred. No library needed.
 */
export function buildPdfPages(pages) {
  if (pages.length === 0) throw new Error('A PDF needs at least one page')
  const chunks = []
  const offsets = []
  let length = 0
  const push = (part) => {
    const bytes = typeof part === 'string' ? encode(part) : part
    chunks.push(bytes)
    length += bytes.length
  }
  const obj = (n, ...parts) => {
    offsets.push(length)
    push(`${n} 0 obj\n`)
    parts.forEach(push)
    push('\nendobj\n')
  }

  // objects: 1 catalog, 2 page tree, then per page: page (3+3i), image (4+3i), content (5+3i)
  push('%PDF-1.4\n')
  obj(1, '<</Type/Catalog/Pages 2 0 R>>')
  obj(2, `<</Type/Pages/Kids[${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}]/Count ${pages.length}>>`)
  pages.forEach(({ jpeg, width, height }, i) => {
    const content = pageContent(width, height)
    obj(3 + 3 * i, `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PAGE_W} ${PAGE_H}]/Resources<</XObject<</Im0 ${4 + 3 * i} 0 R>>>>/Contents ${5 + 3 * i} 0 R>>`)
    obj(4 + 3 * i, `<</Type/XObject/Subtype/Image/Width ${width}/Height ${height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpeg.length}>>\nstream\n`, jpeg, '\nendstream')
    obj(5 + 3 * i, `<</Length ${content.length}>>\nstream\n${content}\nendstream`)
  })

  const count = 3 + 3 * pages.length - 1 // objects, excluding the free entry 0
  const xrefAt = length
  push(`xref\n0 ${count + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`)
  push(`trailer\n<</Size ${count + 1}/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/** One-page landscape PDF embedding the JPEG as-is. */
export const buildPdf = (jpeg, width, height) => buildPdfPages([{ jpeg, width, height }])

/**
 * Encode the card canvas in the chosen format. Resolves { blob, filename }, or null if the browser could not
 * encode it. If a browser quietly returns another image type (e.g. PNG when it lacks WebP), the file name follows the real type.
 */
export async function exportCard(canvas, id) {
  const format = EXPORT_FORMATS.find((f) => f.id === id) ?? EXPORT_FORMATS[0]
  if (format.id === 'pdf') {
    const jpeg = await toBlob(canvas, 'image/jpeg', 0.95)
    if (!jpeg) return null
    const bytes = buildPdf(await blobBytes(jpeg), canvas.width, canvas.height)
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: `${BASE_NAME}.pdf` }
  }
  const blob = await toBlob(canvas, format.mime, format.quality)
  if (!blob) return null
  const ext = blob.type === format.mime ? format.ext : (EXT_BY_MIME[blob.type] ?? format.ext)
  return { blob, filename: `${BASE_NAME}.${ext}` }
}
