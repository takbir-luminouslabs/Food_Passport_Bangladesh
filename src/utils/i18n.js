import { translations } from '../data/translations'

/** Build a translator over a dictionary: lang -> key -> string. Falls back to English, then the key. */
export const createT = (dict) => (lang, key, vars) => {
  const str = dict[lang]?.[key] ?? dict.en?.[key] ?? key
  return vars ? str.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : str
}

export const t = createT(translations)

/** Localized data field, e.g. pick(food, 'name', 'bn') -> food.name_bn, falling back to the other language. */
export const pick = (obj, field, lang) =>
  obj?.[`${field}_${lang}`] || obj?.[`${field}_en`] || obj?.[`${field}_bn`] || ''

export const formatNumber = (n, lang, options) =>
  new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-US', options).format(n)
