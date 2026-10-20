export const fakeStorage = () => {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}
export const brokenStorage = () => ({
  getItem() { throw new Error('denied') },
  setItem() { throw new Error('quota') },
  removeItem() { throw new Error('denied') },
})
