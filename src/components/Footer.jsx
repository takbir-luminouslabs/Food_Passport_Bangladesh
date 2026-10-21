import { Link } from 'react-router-dom'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'

// A row of real food photos above the footer text. Decorative, so the same ten every time.
const STRIP = [
  'chandpur-ilish', 'gazipur-kathal', 'rangamati-pahari-pineapple', 'cumilla-matribhandar-roshmalai', 'patuakhali-tormuj',
  'sabitri-sandesh', 'haribhanga-aam', 'bogura-doi', 'khagrachhari-pahari-holud', 'kushtia-tilkhaja',
]

export default function Footer() {
  const { t } = useLanguage()
  const { content } = useApp()
  const photos = STRIP.map((id) => content?.foods.find((f) => f.id === id)).filter((f) => f?.image_url)
  return (
    <footer className="mt-12 bg-primary-dark text-cream">
      <section data-testid="footer-banner" className="footer-banner relative isolate overflow-hidden">
        {photos.length > 0 && (
          <div aria-hidden="true" data-testid="footer-strip" className="absolute inset-0 -z-10 overflow-hidden">
            {/* the photos are listed twice and the track slides left by exactly one list, so the loop has no seam */}
            <div className="footer-track flex h-full w-max">
              {[...photos, ...photos].map((f, i) => (
                <img key={`${f.id}-${i}`} src={f.image_url} alt="" loading="lazy" decoding="async" className="h-full w-40 shrink-0 object-cover md:w-52" />
              ))}
            </div>
          </div>
        )}
        <div className="bg-primary-dark/80 px-4 py-8 text-center md:py-10">
          <p className="mx-auto max-w-2xl text-2xl font-extrabold leading-snug text-white sm:text-3xl">{t('footer.banner')}</p>
          <Link to="/" state={{ scrollTo: 'pick' }} className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-lime px-7 font-semibold text-primary-dark transition-colors hover:bg-white">
            {t('cta.start')}
          </Link>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-24 pt-10 text-sm md:grid-cols-[1fr_auto] md:pb-10">
        <div className="space-y-2">
          <p className="text-lg font-bold">{t('brand.name')}</p>
          <p className="italic">{t('brand.tagline')}</p>
          <p>{t('footer.madeWith')}</p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 md:flex-col md:gap-0 md:text-right">
          <Link to="/privacy" className="min-h-11 py-3 text-lime underline">{t('footer.privacy')}</Link>
          <Link to="/privacy#sources" className="min-h-11 py-3 text-lime underline">{t('footer.sources')}</Link>
        </nav>
        <p className="border-t border-cream/20 pt-4 md:col-span-2">{t('footer.copyright')}</p>
      </div>
    </footer>
  )
}
