import { useCallback } from 'react'
import { useApp } from '../context/app-context'
import { formatNumber, pick, t } from '../utils/i18n'

/** Current language plus bound helpers: t(key, vars), pick(obj, field), formatNumber(n). */
export function useLanguage() {
  const { state, setLanguage } = useApp()
  const language = state.language
  return {
    language,
    setLanguage,
    t: useCallback((key, vars) => t(language, key, vars), [language]),
    pick: useCallback((obj, field) => pick(obj, field, language), [language]),
    formatNumber: useCallback((n, options) => formatNumber(n, language, options), [language]),
  }
}
