import { buildBookPages } from './bookPages'
import { formatNumber, pick, t } from './i18n'
import { mrzLine } from './passportStyle'
import { buildCardModel, stampFromFood } from './shareCard'

/**
 * Everything the passport-book PDF draws, and nothing else (no saved state, no ids). A cover sheet, then one sheet
 * per spread: the holder data page and the visa pages, each with up to six stamp slots (collected or still locked).
 */
export function buildBookModel({ progress, content, lang, displayName = null, siteUrl = null, now = new Date() }) {
  const card = buildCardModel({ progress, content, lang, displayName, siteUrl, now })
  const foodById = new Map(content.foods.map((f) => [f.id, f]))
  const collectionById = new Map(progress.collections.map((c) => [c.id, c]))
  const order = new Map([...progress.triedIds].map((id, i) => [id, i + 1]))
  const tried = new Set(progress.triedIds)

  const slot = (id) => {
    const food = foodById.get(id)
    if (!food) return null
    if (tried.has(id)) return { state: 'collected', stamp: stampFromFood(food, order.get(id), lang) }
    return { state: 'locked', name: pick(food, 'name', lang), district: food.region ? pick(food.region, 'district', lang) || null : null }
  }

  const visaPage = (page) => {
    const c = collectionById.get(page.collectionId)
    const base = pick(c, 'name', lang)
    return {
      type: 'visa',
      pageLabel: t(lang, 'passport.page', { n: formatNumber(page.visaNo, lang, { minimumIntegerDigits: 2 }) }),
      title: page.parts > 1 ? `${base} · ${formatNumber(page.part, lang)}/${formatNumber(page.parts, lang)}` : base,
      statLine: `${formatNumber(c.collected, lang)}/${formatNumber(c.total, lang)} · ${formatNumber(c.percent, lang)}%`,
      percent: c.percent,
      mrz: mrzLine(`FOOD<<PASSPORT<<${c.id}`),
      slots: page.foodIds.map(slot).filter(Boolean),
    }
  }

  const pages = buildBookPages(progress.collections).map((p) => (p.type === 'data' ? { type: 'data' } : visaPage(p)))
  const sheets = [{ type: 'cover', brand: card.brand, tagline: card.tagline, holder: card.displayName }]
  for (let i = 0; i < pages.length; i += 2) sheets.push({ type: 'spread', left: pages[i], right: pages[i + 1] ?? null })

  const strings = [
    card.brand, card.tagline, card.title, card.level.name, card.level.nextText, card.pageLabel, card.collectedLabel, card.stampHereLabel,
    card.selfReported, card.signatureLabel, card.visaLabel, card.entryLabel, ...card.details.flatMap((d) => [d.label, d.value]),
    ...card.badges, ...card.fields.flatMap((f) => [f.label, f.value]),
    ...sheets.flatMap((s) => (s.type === 'spread' ? [s.left, s.right] : [])).filter((p) => p?.type === 'visa').flatMap((p) => [
      p.pageLabel, p.title, p.statLine,
      ...p.slots.flatMap((sl) => (sl.state === 'collected' ? [sl.stamp.name, sl.stamp.district ?? ''] : [sl.name, sl.district ?? ''])),
    ]),
  ]
  return { lang, card, sheets, sampleText: strings.join(' ') }
}
