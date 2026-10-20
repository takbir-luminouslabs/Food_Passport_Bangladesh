import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'

export default function NotFound() {
  const { t } = useLanguage()
  return (
    <section>
      <h1 className="text-2xl font-bold text-primary">{t('notFound.title')}</h1>
      <Link to="/" className="mt-3 inline-flex min-h-11 items-center text-primary underline">{t('notFound.home')}</Link>
    </section>
  )
}
