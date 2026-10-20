/**
 * Only same-origin / relative / data: URLs are allowed. Remote images would taint the canvas
 * (breaking PNG export) and leak the viewer's IP to third parties, so they are treated as missing.
 */
export function isLocalAsset(url, origin = globalThis.location?.origin ?? '') {
  if (typeof url !== 'string' || url === '') return false
  if (url.startsWith('data:')) return true
  if (url.startsWith('//')) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return origin !== '' && url.startsWith(`${origin}/`)
  return true
}

/** Resolve with a loaded HTMLImageElement, or null on any failure/timeout. Never rejects. */
export function loadImage(url, { ImageCtor = globalThis.Image, origin, timeoutMs = 4000 } = {}) {
  if (!isLocalAsset(url, origin) || !ImageCtor) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new ImageCtor()
    const timer = setTimeout(() => resolve(null), timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}
