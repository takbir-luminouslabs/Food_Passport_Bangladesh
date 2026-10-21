import { Link, NavLink } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { NAV_ROUTES } from '../routes'
import Emblem from './Emblem'
import AuthButton from './AuthButton'
import Icon from './Icon'
import LanguageSwitcher from './LanguageSwitcher'

/** Top bar (brand, language, desktop links) plus a fixed bottom bar on small screens. */
export default function Navbar() {
  const { t } = useLanguage()
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex min-h-11 min-w-0 items-center gap-2 text-base font-bold leading-tight text-primary sm:text-2xl">
            <Emblem className="size-8 shrink-0 sm:size-9" />
            {t('brand.name')}
          </Link>
          <div className="flex shrink-0 items-center gap-1"><AuthButton /><LanguageSwitcher /></div>
        </div>
        <nav aria-label={t('nav.main')} className="mx-auto hidden max-w-5xl gap-1 px-4 pb-2 md:flex"><div className="flex gap-1 rounded-full bg-mint p-1">
          {NAV_ROUTES.map(({ path, labelKey }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex min-h-11 items-center rounded-full px-4 text-sm transition-colors motion-reduce:transition-none ${isActive ? 'bg-primary font-semibold text-lime shadow' : 'text-primary hover:bg-white/70'}`
              }
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </div></nav>
      </header>

      <nav
        aria-label={t('nav.quick')}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-primary/10 bg-white/95 backdrop-blur md:hidden"
      >
        {NAV_ROUTES.map(({ path, labelKey, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `group flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[11px] leading-tight [overflow-wrap:anywhere] max-[359px]:text-[9px] ${isActive ? 'font-bold text-primary' : 'text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors max-[359px]:w-9 group-hover:bg-primary/10 motion-reduce:transition-none ${isActive ? 'bg-primary text-lime group-hover:bg-primary' : ''}`}>
                  <Icon name={icon} className="size-5" strokeWidth={isActive ? 8 : 7} />
                </span>
                {t(labelKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
