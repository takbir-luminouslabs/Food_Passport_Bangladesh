import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import LoadingState from './components/LoadingState'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthProvider'
import { HolderPhotoProvider } from './context/HolderPhotoProvider'
import { useApp } from './context/app-context'
import { useLanguage } from './hooks/useLanguage'
import Challenges from './pages/Challenges'
import ComingSoon from './pages/ComingSoon'
import Quiz from './pages/Quiz'
import FoodDetail from './pages/FoodDetail'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Privacy from './pages/Privacy'

/** Old addresses (/discover, /passport) now live on the home page: go there and scroll to the matching step. */
function ToStep({ step }) {
  const { search, hash } = useLocation()
  const scrollTo = hash === '#share' ? 'download' : step
  return <Navigate to={{ pathname: '/', search }} replace state={{ scrollTo }} />
}

function Content() {
  const { status, retry } = useApp()
  const { t } = useLanguage()
  if (status === 'loading') return <LoadingState label={t('common.loading')} />
  if (status === 'error') {
    return (
      <div role="alert">
        <p>{t('common.error')}</p>
        <button type="button" onClick={retry} className="mt-2 min-h-11 rounded-full bg-primary px-5 text-lime">
          {t('common.retry')}
        </button>
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/discover" element={<ToStep step="pick" />} />
      <Route path="/discover/:foodId" element={<FoodDetail />} />
      <Route path="/passport" element={<ToStep step="passport" />} />
      <Route path="/challenges" element={<Challenges />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/leaderboard" element={<ComingSoon titleKey="nav.leaderboard" />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function Boundary() {
  const { t } = useLanguage()
  return (
    <ErrorBoundary message={t('common.crash')} reloadLabel={t('common.reload')}>
      <Content />
    </ErrorBoundary>
  )
}

// HashRouter keeps client-side routes working on GitHub Pages without server rewrites.
export default function App({ authClient, ...props }) {
  return (
    <AppProvider {...props}>
      <AuthProvider client={authClient}>
        <HolderPhotoProvider>
          <HashRouter>
            <Layout>
              <Boundary />
            </Layout>
          </HashRouter>
        </HolderPhotoProvider>
      </AuthProvider>
    </AppProvider>
  )
}
