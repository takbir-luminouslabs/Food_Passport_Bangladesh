/** Minimal recording 2D context for asserting what a card draws, without a real canvas. */
export function createRecordingCtx() {
  const calls = []
  const rec = (name) => (...args) => {
    calls.push([name, ...args])
  }
  const ctx = {
    calls,
    measureText: (text) => ({ width: String(text).length * 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    texts: () => calls.filter((c) => c[0] === 'fillText').map((c) => c[1]),
  }
  for (const m of [
    'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arcTo', 'arc', 'bezierCurveTo', 'quadraticCurveTo',
    'fill', 'stroke', 'clip', 'fillRect', 'strokeRect', 'fillText', 'drawImage', 'translate', 'scale', 'rotate', 'setLineDash',
  ]) {
    ctx[m] = rec(m)
  }
  return ctx
}
