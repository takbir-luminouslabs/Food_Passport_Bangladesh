import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import { useScrollToHash } from '../hooks/useScrollToHash'

export default function Privacy() {
  const { content } = useApp()
  const { t } = useLanguage()
  useScrollToHash()

  const byHost = new Map()
  for (const f of content.foods) {
    if (!f.source_url) continue
    const host = new URL(f.source_url).hostname
    if (!byHost.has(host)) byHost.set(host, f.source_url)
  }

  const block = (key, body) => (
    <section aria-labelledby={`p-${key}`} className="mt-6">
      <h2 id={`p-${key}`} className="text-xl font-bold">{t(`privacy.${key}Title`)}</h2>
      {body}
    </section>
  )

  return (
    <article>
      <h1 className="text-2xl font-bold text-primary">{t('privacy.title')}</h1>
      {block('stored', <p className="mt-2">{t('privacy.storedBody')}</p>)}
      {block('control', <p className="mt-2">{t('privacy.controlBody')}</p>)}
      {block('analytics', <p className="mt-2">{t('privacy.analyticsBody')}</p>)}
      <section id="sources" aria-labelledby="p-sources" className="mt-6 scroll-mt-4">
        <h2 id="p-sources" className="text-xl font-bold">{t('privacy.sourcesTitle')}</h2>
        <p className="mt-2">{t('privacy.sourcesBody')}</p>
        <p className="mt-2">{t('tracking.disclaimer')}</p>
        <p className="mt-2">{t('privacy.imagesBody')}</p>
        {byHost.size > 0 && (
          <>
            <h3 className="mt-3 font-semibold">{t('privacy.sourcesList')}</h3>
            <ul className="mt-1 list-disc pl-5">
              {[...byHost].map(([host, url]) => (
                <li key={host}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{host}</a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {block(
        'donation',
        <>
          <p className="mt-2">{t('donation.optional')}</p>
          <p className="mt-2">{t('donation.safety')}</p>
        </>,
      )}
    </article>
  )
}
