// Line-art food icons in a 100x100 box, one per category. One source drives both the canvas card and the site's SVG.
// Commands: M x y | L x y | Q cx cy x y | C x1 y1 x2 y2 x y | A cx cy r a0 a1 (clockwise arc, radians) | O cx cy r (full circle) | Z

const star = (cx, cy, outer, inner) => {
  const cmds = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? outer : inner
    cmds.push([i === 0 ? 'M' : 'L', +(cx + r * Math.cos(a)).toFixed(1), +(cy + r * Math.sin(a)).toFixed(1)])
  }
  cmds.push(['Z'])
  return cmds
}

const CATEGORY_ICONS = {
  // a pile of fuchka shells on a plate
  street_food: [[['O', 33, 58, 14]], [['O', 67, 58, 14]], [['O', 50, 34, 14]], [['M', 12, 80], ['Q', 50, 98, 88, 80]]],
  // bowl with a mound of rice
  rice_biryani: [[['A', 50, 48, 36, 0, Math.PI]], [['M', 14, 48], ['L', 86, 48]], [['M', 24, 48], ['Q', 50, 12, 76, 48]], [['M', 36, 86], ['L', 64, 86]]],
  // fish
  fish_seafood: [[['M', 12, 50], ['Q', 40, 18, 70, 50], ['Q', 40, 82, 12, 50], ['Z']], [['M', 70, 50], ['L', 90, 32], ['L', 90, 68], ['Z']], [['O', 28, 46, 3]]],
  // drumstick
  meat_savoury: [[['O', 62, 38, 24]], [['M', 45, 55], ['L', 22, 78]], [['O', 17, 73, 6]], [['O', 27, 83, 6]]],
  // sweet in a cup
  sweets_desserts: [[['O', 50, 40, 20]], [['M', 22, 62], ['L', 30, 86], ['L', 70, 86], ['L', 78, 62], ['Z']], [['A', 50, 40, 11, 3.6, 4.9]]],
  // round pitha with swirl
  pitha_snacks: [[['O', 50, 50, 36]], [['A', 50, 50, 22, 0.3, 5.6]], [['A', 50, 50, 10, 1.2, 6.2]]],
  // sunrise over a plate
  breakfast_everyday: [[['A', 50, 56, 22, Math.PI, Math.PI * 2]], [['M', 50, 16], ['L', 50, 24]], [['M', 20, 28], ['L', 26, 34]], [['M', 80, 28], ['L', 74, 34]], [['M', 12, 56], ['L', 88, 56]], [['M', 26, 72], ['Q', 50, 92, 74, 72]]],
  // tea cup with steam
  drinks: [[['M', 22, 38], ['L', 78, 38], ['L', 72, 76], ['Q', 50, 86, 28, 76], ['Z']], [['A', 80, 54, 12, -Math.PI / 2, Math.PI / 2]], [['M', 38, 28], ['Q', 32, 20, 38, 12]], [['M', 56, 28], ['Q', 50, 20, 56, 12]], [['M', 18, 90], ['L', 82, 90]]],
  // star for regional specialties
  regional_specialties: [star(50, 54, 40, 17)],
}
// Interface icons: the same line-art look, drawn on the same 100x100 grid, so the whole site shares one icon set.
const PI = Math.PI
const UI_ICONS = {
  home: [[['M', 14, 48], ['L', 50, 16], ['L', 86, 48]], [['M', 24, 40], ['L', 24, 84], ['L', 76, 84], ['L', 76, 40]], [['M', 42, 84], ['L', 42, 62], ['L', 58, 62], ['L', 58, 84]]],
  search: [[['O', 44, 44, 26]], [['M', 64, 64], ['L', 86, 86]]],
  book: [[['M', 26, 10], ['L', 76, 10], ['Q', 82, 10, 82, 16], ['L', 82, 84], ['Q', 82, 90, 76, 90], ['L', 26, 90], ['Q', 18, 90, 18, 82], ['L', 18, 18], ['Q', 18, 10, 26, 10], ['Z']], [['O', 50, 42, 14]], [['M', 36, 70], ['L', 64, 70]]],
  trophy: [[['M', 30, 14], ['L', 70, 14], ['L', 70, 40], ['Q', 70, 60, 50, 60], ['Q', 30, 60, 30, 40], ['Z']], [['M', 30, 24], ['L', 16, 24], ['Q', 16, 42, 32, 46]], [['M', 70, 24], ['L', 84, 24], ['Q', 84, 42, 68, 46]], [['M', 50, 60], ['L', 50, 78]], [['M', 32, 90], ['L', 68, 90]], [['M', 38, 78], ['L', 62, 78]]],
  help: [[['O', 50, 50, 38]], [['M', 38, 40], ['Q', 38, 28, 50, 28], ['Q', 62, 28, 62, 40], ['Q', 62, 48, 50, 54], ['L', 50, 60]], [['O', 50, 72, 2]]],
  chart: [[['M', 24, 84], ['L', 24, 54]], [['M', 50, 84], ['L', 50, 24]], [['M', 76, 84], ['L', 76, 42]], [['M', 12, 92], ['L', 88, 92]]],
  lock: [[['M', 28, 44], ['L', 72, 44], ['Q', 78, 44, 78, 50], ['L', 78, 80], ['Q', 78, 86, 72, 86], ['L', 28, 86], ['Q', 22, 86, 22, 80], ['L', 22, 50], ['Q', 22, 44, 28, 44], ['Z']], [['M', 34, 44], ['L', 34, 32], ['Q', 34, 14, 50, 14], ['Q', 66, 14, 66, 32], ['L', 66, 44]], [['M', 50, 60], ['L', 50, 72]]],
  check: [[['M', 22, 52], ['L', 42, 72], ['L', 80, 28]]],
  close: [[['M', 24, 24], ['L', 76, 76]], [['M', 76, 24], ['L', 24, 76]]],
  arrowLeft: [[['M', 82, 50], ['L', 20, 50]], [['M', 44, 26], ['L', 20, 50], ['L', 44, 74]]],
  arrowRight: [[['M', 18, 50], ['L', 80, 50]], [['M', 56, 26], ['L', 80, 50], ['L', 56, 74]]],
  pin: [[['A', 50, 40, 28, PI, PI * 2], ['Q', 78, 60, 50, 92], ['Q', 22, 60, 22, 40], ['Z']], [['O', 50, 40, 9]]],
  medal: [[['O', 50, 36, 22]], [['M', 38, 54], ['L', 28, 90], ['L', 50, 78], ['L', 72, 90], ['L', 62, 54]], [['O', 50, 36, 8]]],
  expand: [[['M', 60, 12], ['L', 88, 12], ['L', 88, 40]], [['M', 88, 12], ['L', 56, 44]], [['M', 40, 88], ['L', 12, 88], ['L', 12, 60]], [['M', 12, 88], ['L', 44, 56]]],
}

const GENERIC = [[['O', 50, 50, 34]], [['O', 50, 50, 20]], [['M', 50, 8], ['L', 50, 20]]]

export const CATEGORY_IDS = Object.keys(CATEGORY_ICONS)
export const UI_ICON_IDS = Object.keys(UI_ICONS)
const paths = (id) => CATEGORY_ICONS[id] ?? UI_ICONS[id] ?? GENERIC

export function drawCommands(ctx, cmds) {
  ctx.beginPath()
  for (const [op, ...a] of cmds) {
    if (op === 'M') ctx.moveTo(a[0], a[1])
    else if (op === 'L') ctx.lineTo(a[0], a[1])
    else if (op === 'Q') ctx.quadraticCurveTo(a[0], a[1], a[2], a[3])
    else if (op === 'C') ctx.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5])
    else if (op === 'A') {
      ctx.moveTo(a[0] + a[2] * Math.cos(a[3]), a[1] + a[2] * Math.sin(a[3]))
      ctx.arc(a[0], a[1], a[2], a[3], a[4])
    } else if (op === 'O') {
      ctx.moveTo(a[0] + a[2], a[1])
      ctx.arc(a[0], a[1], a[2], 0, Math.PI * 2)
    } else if (op === 'Z') ctx.closePath()
  }
}

/** Stroke the icon for `id` centred on (cx, cy) in a `size`-px square, in `color`. */
export function paintIcon(ctx, id, cx, cy, size, color, lineWidth = 4.5) {
  const k = size / 100
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(k, k)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const cmds of paths(id)) {
    drawCommands(ctx, cmds)
    ctx.stroke()
  }
  ctx.restore()
}

const fmt = (n) => +n.toFixed(1)

/** SVG path data for a list of command-array paths (the format every icon and scene is drawn in). */
export function commandsToSvg(list) {
  return list
    .map((cmds) => cmds.map(([op, ...a]) => {
      if (op === 'M' || op === 'L') return `${op}${a[0]} ${a[1]}`
      if (op === 'Q') return `Q${a[0]} ${a[1]} ${a[2]} ${a[3]}`
      if (op === 'C') return `C${a.join(' ')}`
      if (op === 'Z') return 'Z'
      if (op === 'O') return `M${fmt(a[0] + a[2])} ${a[1]}A${a[2]} ${a[2]} 0 1 1 ${fmt(a[0] - a[2])} ${a[1]}A${a[2]} ${a[2]} 0 1 1 ${fmt(a[0] + a[2])} ${a[1]}`
      // A: partial clockwise arc
      const [cx, cy, r, a0, a1] = a
      const large = a1 - a0 > Math.PI ? 1 : 0
      return `M${fmt(cx + r * Math.cos(a0))} ${fmt(cy + r * Math.sin(a0))}A${r} ${r} 0 ${large} 1 ${fmt(cx + r * Math.cos(a1))} ${fmt(cy + r * Math.sin(a1))}`
    }).join(''))
    .join('')
}

/** SVG path data (100x100 viewBox) for the same icon, for use on the website. */
export const iconSvgPath = (id) => commandsToSvg(paths(id))
