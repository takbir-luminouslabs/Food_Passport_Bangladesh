import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Emoji and text symbols used as icons look different on every phone and clash with the theme. The site draws every
// icon itself (src/utils/stampIcons.js), so none of these may creep back into the source.
const GLYPHS = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2190}-\u{21FF}\u{2933}\u{2922}\u{2713}\u{2715}]/u

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(jsx?|css)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })

test('no emoji or symbol glyphs are used as icons in the source', () => {
  const offenders = []
  for (const file of walk('src')) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const m = line.match(GLYPHS)
      if (m) offenders.push(`${file}:${i + 1} ${m[0]}  ${line.trim().slice(0, 70)}`)
    })
  }
  expect(offenders, offenders.join('\n')).toEqual([])
})
