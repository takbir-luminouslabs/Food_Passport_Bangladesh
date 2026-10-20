import { useLanguage } from '../hooks/useLanguage'

// Each language is labelled in its own script so it is recognisable whichever UI language is active.
const OPTIONS = [
  { code: 'bn', label: 'বাংলা' },
  { code: 'en', label: 'English' },
]

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()
  return (
    <div role="group" aria-label={t('nav.language')} className="flex overflow-hidden rounded-full border border-primary">
      {OPTIONS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className={`min-h-11 px-4 text-sm font-semibold ${language === code ? 'bg-primary text-lime' : 'text-primary'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
