// Wide line-art scenes for the passport pages, in the same command-array format as the icons (see stampIcons.js).
import { commandsToSvg, drawCommands } from './stampIcons'

const PI = Math.PI
const W = 300
const H = 100

const wave = (y, x0, x1, amp = 3, len = 22) => {
  const cmds = [['M', x0, y]]
  for (let x = x0, up = true; x < x1; x += len, up = !up) cmds.push(['Q', x + len / 2, y + (up ? -amp : amp), Math.min(x + len, x1), y])
  return cmds
}

const palm = (x, base, top, lean = 0, size = 1) => {
  const tx = x + lean
  const f = (dx, dy, cx, cy) => [['M', tx, top], ['Q', tx + cx * size, top + cy * size, tx + dx * size, top + dy * size]]
  return [
    [['M', x, base], ['Q', x + lean * 0.2, (base + top) / 2, tx, top]],
    f(-22, 8, -12, -12), f(-18, -4, -10, -20), f(22, 8, 12, -12), f(18, -4, 10, -20), f(0, -10, -2, -16),
  ]
}

const bird = (x, y) => [['M', x, y], ['Q', x + 5, y - 7, x + 10, y], ['Q', x + 15, y - 7, x + 20, y]]

const SCENES = {
  // a country boat and a sail on the river, palms on the bank
  river: [
    ...palm(26, 80, 28, 4),
    ...palm(62, 82, 48, -3, 0.7),
    [['M', 112, 76], ['L', 214, 76], ['Q', 162, 96, 112, 76], ['Z']],
    [['M', 132, 76], ['Q', 162, 46, 196, 76]],
    [['M', 162, 76], ['L', 162, 54]],
    [['M', 250, 74], ['L', 250, 24]],
    [['M', 250, 28], ['L', 276, 70], ['L', 250, 70]],
    bird(172, 22), bird(212, 34),
    wave(90, 0, 300), wave(97, 20, 280, 2.5, 26),
  ],
  // palms, a domed mosque with two minarets and a river bank
  skyline: [
    ...palm(34, 90, 40, -3),
    ...palm(66, 90, 56, 3, 0.7),
    [['A', 150, 64, 20, PI, PI * 2]],
    [['M', 130, 64], ['L', 130, 90]],
    [['M', 170, 64], ['L', 170, 90]],
    [['M', 150, 44], ['L', 150, 34]],
    [['M', 112, 90], ['L', 112, 52], ['L', 122, 52], ['L', 122, 90]],
    [['M', 112, 52], ['Q', 117, 40, 122, 52]],
    [['M', 178, 90], ['L', 178, 52], ['L', 188, 52], ['L', 188, 90]],
    [['M', 178, 52], ['Q', 183, 40, 188, 52]],
    [['M', 144, 90], ['L', 144, 76], ['Q', 150, 68, 156, 76], ['L', 156, 90]],
    ...palm(250, 90, 36, 4),
    ...palm(284, 90, 52, -4, 0.75),
    [['M', 0, 90], ['L', 300, 90]],
    wave(97, 10, 290, 2.5, 26),
  ],
}

export const SCENE_IDS = Object.keys(SCENES)

/** Stroke a scene with its top-left corner at (x, y), scaled to `width` px wide. */
export function paintScene(ctx, id, x, y, width, color, lineWidth = 2.2) {
  const k = width / W
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const cmds of SCENES[id]) {
    drawCommands(ctx, cmds)
    ctx.stroke()
  }
  ctx.restore()
}

/** `{w, h, d}`: viewBox size and SVG path data of a scene, for the website. */
export const sceneSvg = (id) => ({ w: W, h: H, d: commandsToSvg(SCENES[id]) })
