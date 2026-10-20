import { isLocalAsset, loadImage } from './loadImage'

describe('isLocalAsset (local assets only, so exports are never tainted)', () => {
  const origin = 'https://me.github.io'
  test.each([
    ['/assets/a.jpg', true], ['assets/a.jpg', true], ['./a.jpg', true],
    ['https://me.github.io/fp/a.jpg', true], ['data:image/png;base64,AAAA', true],
    ['https://other.com/a.jpg', false], ['//cdn.com/a.jpg', false], ['http://me.github.io/a.jpg', false],
    ['', false], [null, false], [undefined, false],
  ])('%s -> %s', (url, expected) => {
    expect(isLocalAsset(url, origin)).toBe(expected)
  })
})

class FakeImage {
  static mode = 'load'
  set src(v) {
    this._src = v
    setTimeout(() => (FakeImage.mode === 'load' ? this.onload?.() : FakeImage.mode === 'error' ? this.onerror?.() : undefined), 0)
  }
}

test('resolves with the image when it loads', async () => {
  FakeImage.mode = 'load'
  expect(await loadImage('/a.jpg', { ImageCtor: FakeImage, origin: 'https://x.io' })).toBeInstanceOf(FakeImage)
})

test('resolves null on error, never rejects', async () => {
  FakeImage.mode = 'error'
  expect(await loadImage('/a.jpg', { ImageCtor: FakeImage, origin: 'https://x.io' })).toBeNull()
})

test('resolves null after the timeout if the image hangs', async () => {
  FakeImage.mode = 'hang'
  expect(await loadImage('/a.jpg', { ImageCtor: FakeImage, origin: 'https://x.io', timeoutMs: 20 })).toBeNull()
})

test('skips remote URLs without even trying to load them', async () => {
  FakeImage.mode = 'load'
  expect(await loadImage('https://evil.com/a.jpg', { ImageCtor: FakeImage, origin: 'https://x.io' })).toBeNull()
})
