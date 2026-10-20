import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { HillsScene } from './Scenes'

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="mt-10 bg-primary-dark text-cream">
      <HillsScene className="-mt-px block h-24 w-full bg-cream sm:h-32" />
      <div className="mx-auto max-w-5xl space-y-2 px-4 pb-24 pt-6 text-sm md:pb-8">
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
