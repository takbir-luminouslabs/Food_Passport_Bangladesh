import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="mt-10 bg-primary-dark px-4 py-8 pb-24 text-cream md:pb-8">
      <div className="mx-auto max-w-5xl space-y-2 text-sm">
        <p className="text-lg font-bold">{t('brand.name')}</p>
        <p className="italic">{t('brand.tagline')}</p>
        <p>{t('footer.madeWith')}</p>
        <nav aria-label="Legal" className="flex gap-4">
          <Link to="/privacy" className="min-h-11 py-3 text-lime underline">{t('footer.privacy')}</Link>
          <Link to="/privacy#sources" className="min-h-11 py-3 text-lime underline">{t('footer.sources')}</Link>
        </nav>
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  )
}
