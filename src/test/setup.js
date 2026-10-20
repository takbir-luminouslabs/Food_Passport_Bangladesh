import '@testing-library/jest-dom/vitest'

// jsdom never loads images, so make them fail at once instead of leaving a render waiting on them
globalThis.Image = class {
  set src(_v) { queueMicrotask(() => this.onerror?.()) }
}
