import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/app-context'
import { useHolderPhoto } from '../context/holder-photo-context'
import { useLanguage } from '../hooks/useLanguage'
import { buildBookModel } from '../utils/bookModel'
import { buildBookPages } from '../utils/bookPages'
import { renderBook } from '../utils/bookPdf'
import DataPage from './DataPage'
import Icon from './Icon'
import VisaPage from './VisaPage'
import ZoomDialog from './ZoomDialog'

/** An open passport: two pages per spread (holder data page first, then visa pages of six stamps each). */
export default function PassportBook() {
  const { content, progress } = useApp()
  const { language, t, pick, formatNumber } = useLanguage()
  const holder = useHolderPhoto()
  const [pdf, setPdf] = useState({ phase: 'idle' }) // idle | busy (n, total) | done | error
  const abortRef = useRef(null)
  useEffect(() => () => abortRef.current?.abort(), [])
  const [spread, setSpread] = useState(0)
  const [zoomed, setZoomed] = useState(null) // the visa page being floated
  const triedIds = new Set(progress.triedIds)
  const collectionById = new Map(progress.collections.map((c) => [c.id, c]))

  const pages = useMemo(() => buildBookPages(progress.collections), [progress.collections])
  const spreadCount = Math.ceil(pages.length / 2)
  const go = (to) => setSpread(Math.min(spreadCount - 1, Math.max(0, to)))
  const onKeyDown = (e) => {
    if (e.target.closest('input,textarea,select')) return
    if (e.key === 'ArrowRight') go(spread + 1)
    else if (e.key === 'ArrowLeft') go(spread - 1)
  }

  const downloadPdf = async () => {
    const controller = new AbortController()
    abortRef.current = controller
    setPdf({ phase: 'busy', n: 0, total: spreadCount + 1 })
    try {
      const model = buildBookModel({ progress, content, lang: language, displayName: holder.name, siteUrl: import.meta.env.VITE_SITE_URL })
      const { blob, filename } = await renderBook(model, {
        photo: holder.canvas,
        signal: controller.signal,
        onProgress: (n, total) => setPdf({ phase: 'busy', n, total }),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setPdf({ phase: 'done' })
    } catch (e) {
      if (e?.name !== 'AbortError') setPdf({ phase: 'error' })
    }
  }

  const renderPage = (pageIndex, side) => {
    const page = pages[pageIndex]
    if (!page) return <div aria-hidden="true" />
    if (page.type === 'data') return <DataPage side={side} />
    return (
      <VisaPage
        collection={collectionById.get(page.collectionId)}
        index={page.visaNo - 1}
        foodIds={page.foodIds}
        part={page.part}
        parts={page.parts}
        foods={content.foods}
        triedIds={triedIds}
        side={side}
        onEnlarge={() => setZoomed(page)}
      />
    )
  }

  const navButton = 'flex min-h-11 items-center rounded-full border-2 border-primary px-4 font-semibold text-primary disabled:opacity-40'
  return (
    <div role="group" aria-label={t('book.label')} onKeyDown={onKeyDown} className="space-y-4">
      <div className="passport-book">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 md:gap-0">
          {renderPage(spread * 2, 'left')}
          {renderPage(spread * 2 + 1, 'right')}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => go(spread - 1)} disabled={spread === 0} aria-label={t('book.prev')} className={navButton}>
          <Icon name="arrowLeft" className="size-5" />
        </button>
        <p aria-live="polite" className="font-semibold text-primary">
          {t('book.position', { n: formatNumber(spread + 1), total: formatNumber(spreadCount) })}
        </p>
        <button type="button" onClick={() => go(spread + 1)} disabled={spread === spreadCount - 1} aria-label={t('book.next')} className={navButton}>
          <Icon name="arrowRight" className="size-5" />
        </button>
      </div>

      <nav aria-label={t('book.jump')} className="flex flex-wrap gap-2">
        {progress.collections.map((c) => {
          const first = pages.findIndex((p) => p.collectionId === c.id)
          const last = pages.findLastIndex((p) => p.collectionId === c.id)
          const current = Math.floor(first / 2) <= spread && spread <= Math.floor(last / 2)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => go(Math.floor(first / 2))}
              aria-current={current ? 'true' : undefined}
              className={`min-h-11 rounded-full border-2 px-3 text-sm ${current ? 'border-primary bg-primary font-semibold text-lime' : 'border-primary/30 text-primary'}`}
            >
              {pick(c, 'name')}
            </button>
          )
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={downloadPdf}
          disabled={pdf.phase === 'busy'}
          className="min-h-11 rounded-full border-2 border-primary bg-primary px-5 font-semibold text-lime shadow-sm transition duration-150 enabled:hover:-translate-y-0.5 enabled:hover:bg-primary-dark enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
        >
          {t('book.pdf')}
        </button>
        {pdf.phase === 'busy' && (
          <p role="status" className="text-sm text-muted">{t('book.pdfBusy', { n: formatNumber(Math.max(1, pdf.n)), total: formatNumber(pdf.total) })}</p>
        )}
        {pdf.phase === 'done' && <p role="status" className="text-sm text-muted">{t('book.pdfDone')}</p>}
        {pdf.phase === 'error' && <p role="alert" className="text-sm text-red-700">{t('book.pdfError')}</p>}
      </div>

      {zoomed && (
        <ZoomDialog label={pick(collectionById.get(zoomed.collectionId), 'name')} closeLabel={t('common.close')} onClose={() => setZoomed(null)}>
          {/* following a stamp link leaves the page, so the floating copy should not linger */}
          <div onClick={(e) => e.target.closest('a') && setZoomed(null)}>
            <VisaPage
              large
              collection={collectionById.get(zoomed.collectionId)}
              index={zoomed.visaNo - 1}
              foodIds={zoomed.foodIds}
              part={zoomed.part}
              parts={zoomed.parts}
              foods={content.foods}
              triedIds={triedIds}
            />
          </div>
          <p className="mt-3 text-center text-sm text-cream">{t('dialog.hint')}</p>
        </ZoomDialog>
      )}
    </div>
  )
}
