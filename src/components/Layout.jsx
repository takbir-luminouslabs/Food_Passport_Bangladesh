import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import Footer from './Footer'
import Navbar from './Navbar'
import RouteAnnouncer from './RouteAnnouncer'
import ToastHost from './ToastHost'

export default function Layout({ children }) {
  const { saveFailed, status } = useApp()
  const { t } = useLanguage()
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">{t('nav.skip')}</a>
      <Navbar />
      <RouteAnnouncer siteName={t('brand.name')} />
      {saveFailed && <p role="alert" className="bg-gold/30 px-4 py-2 text-sm">{t('storage.failed')}</p>}
      {status === 'ready' && <ToastHost />}
      <main id="main" tabIndex={-1} className="mx-auto outline-none min-h-[60vh] max-w-5xl px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <Footer />
    </>
  )
}
