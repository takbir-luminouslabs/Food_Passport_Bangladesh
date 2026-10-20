import { useLanguage } from '../hooks/useLanguage'

export default function ComingSoon({ titleKey }) {
  const { t } = useLanguage()
  return (
    <section>
      <h1 className="text-2xl font-bold text-primary">{t(titleKey)}</h1>
      <p className="mt-2 text-muted">{t('coming.soon')}</p>
    </section>
  )
}
