import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/app-context'
import { useHolderPhoto } from '../context/holder-photo-context'
import { useCountDownload } from '../hooks/useCountDownload'
import { useLanguage } from '../hooks/useLanguage'
import { EXPORT_FORMATS, exportCard } from '../utils/exportFormats'
import { CARD_HEIGHT, CARD_WIDTH, buildCardModel, renderShareCard } from '../utils/shareCard'
import { shareLinks } from '../utils/shareLinks'
import TiltSurface from './TiltSurface'
import ZoomDialog from './ZoomDialog'

const SHARE_FILENAME = 'food-passport.png' // native share always sends the PNG

const menuItem = 'flex min-h-11 w-full items-center rounded-xl px-3 text-left font-semibold text-primary transition-colors hover:bg-primary/10'

/** Live preview of the passport card plus download (PNG, JPG, WebP or PDF) / native share. All rendering happens in the browser. */
export default function ShareCard() {
  const { content, progress } = useApp()
  const { language, t, formatNumber } = useLanguage()
  const photo = useHolderPhoto()
  const { name, setName } = photo
  const [photoError, setPhotoError] = useState(null)
  const [format, setFormat] = useState('png')
  const [status, setStatus] = useState('loading')
  const [zoomUrl, setZoomUrl] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMsg, setMenuMsg] = useState(null)
  const canvasRef = useRef(null)
  const shareRef = useRef(null)
  const shareBtnRef = useRef(null)

  const countDownload = useCountDownload()
  const model = useMemo(
    () => buildCardModel({ progress, content, lang: language, displayName: name, siteUrl: import.meta.env.VITE_SITE_URL }),
    [progress, content, language, name],
  )

  useEffect(() => {
    let stale = false
    renderShareCard(canvasRef.current, model, { isStale: () => stale, photo: photo.canvas })
      .then(() => !stale && setStatus('ready'))
      .catch(() => !stale && setStatus('error'))
    return () => {
      stale = true
    }
  }, [model, photo.canvas])

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be chosen again
    if (!file) return
    const result = await photo.setFromFile(file)
    setPhotoError(result.ok ? null : `photo.error${{ type: 'Type', size: 'Size' }[result.reason] ?? 'Read'}`)
  }
  const removePhoto = () => {
    photo.clear()
    setPhotoError(null)
  }

  const toBlob = () => new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'))

  const download = async () => {
    const result = await exportCard(canvasRef.current, format)
    if (!result) return setStatus('error')
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
    countDownload()
    return undefined
  }

  // Float the card up as a real <img> (so phones can long-press to save it). The URL is freed on close.
  const enlarge = async () => {
    const blob = await toBlob()
    if (!blob) return setStatus('error')
    setZoomUrl(URL.createObjectURL(blob))
    return undefined
  }
  const closeZoom = () => {
    if (zoomUrl) URL.revokeObjectURL(zoomUrl)
    setZoomUrl(null)
  }

  const canCopyImage = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function'
  const siteUrl = import.meta.env.VITE_SITE_URL || `${window.location.origin}${window.location.pathname}`
  const message = t('share.message', { count: formatNumber(progress.triedCount) })
  const links = shareLinks({ text: message, url: siteUrl })

  const share = async () => {
    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      const blob = await toBlob()
      if (!blob) return setStatus('error')
      const file = new File([blob], SHARE_FILENAME, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: model.title })
        } catch (e) {
          if (e?.name !== 'AbortError') setStatus('error')
        }
        return undefined
      }
    }
    setMenuMsg(null)
    setMenuOpen((open) => !open)
    return undefined
  }

  const copyImage = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob() })])
      setMenuMsg('share.copied')
    } catch {
      setMenuMsg('share.copyFailed')
    }
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl)
      setMenuMsg('share.linkCopied')
    } catch {
      setMenuMsg('share.copyFailed')
    }
  }

  // close the menu on Escape (focus goes back to the button) or a click outside it
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      shareBtnRef.current?.focus()
    }
    const onPointer = (e) => {
      if (!shareRef.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [menuOpen])

  const ready = status === 'ready'
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,36rem)_1fr]">
      <div>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={t('share.enlarge')}
          onClick={enlarge}
          className="block w-full cursor-zoom-in rounded-2xl shadow transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <canvas
            ref={canvasRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            aria-hidden="true"
            className="w-full rounded-2xl bg-card"
          />
        </button>
        <button type="button" aria-haspopup="dialog" onClick={enlarge} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary/30 px-4 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10 sm:hidden">
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
          </svg>
          {t('share.viewBigger')}
        </button>
        {status === 'loading' && <p role="status" className="mt-2 text-sm text-muted">{t('share.generating')}</p>}
        {status === 'error' && <p role="alert" className="mt-2 text-sm text-red-700">{t('share.error')}</p>}
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor="card-name" className="block text-sm font-semibold">{t('share.nameLabel')}</label>
          <input
            id="card-name"
            type="text"
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-primary/30 bg-card px-3"
          />
          <p className="mt-1 text-xs text-muted">{t('share.nameHint')}</p>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-11 cursor-pointer items-center rounded-full border-2 border-primary/30 px-4 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold">
              {photo.canvas ? t('photo.change') : t('photo.add')}
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t('photo.add')} onChange={onPhoto} className="sr-only" />
            </label>
            {photo.canvas && (
              <button type="button" onClick={removePhoto} className="min-h-11 rounded-full px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50">
                {t('photo.remove')}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">{t('photo.hint')}</p>
          {photoError && <p role="alert" className="mt-1 text-sm text-red-700">{t(photoError)}</p>}
        </div>
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold">{t('share.format')}</legend>
          <div role="radiogroup" aria-label={t('share.format')} className="mt-1 flex flex-wrap gap-2">
            {EXPORT_FORMATS.map((f) => (
              <label
                key={f.id}
                className="flex min-h-11 min-w-16 cursor-pointer items-center justify-center rounded-full border-2 border-primary/30 px-4 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-lime has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold"
              >
                <input type="radio" name="card-format" value={f.id} checked={format === f.id} onChange={() => setFormat(f.id)} className="sr-only" />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            disabled={!ready}
            className="min-h-11 rounded-full border-2 border-primary bg-primary px-5 font-semibold text-lime shadow-sm transition duration-150 enabled:hover:-translate-y-0.5 enabled:hover:bg-primary-dark enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
          >
            {t('share.download')}
          </button>
          <div ref={shareRef} className="relative">
            <button
              ref={shareBtnRef}
              type="button"
              onClick={share}
              disabled={!ready}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              className="min-h-11 rounded-full border-2 border-primary px-5 font-semibold text-primary transition duration-150 enabled:hover:-translate-y-0.5 enabled:hover:bg-primary enabled:hover:text-lime enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
            >
              {t('share.native')}
            </button>
            {menuOpen && (
              <div role="group" aria-label={t('share.menu')} className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-primary/15 bg-card p-2 shadow-xl">
                {canCopyImage && (
                  <button type="button" onClick={copyImage} className={menuItem}>{t('share.copyImage')}</button>
                )}
                <button type="button" onClick={copyLink} className={menuItem}>{t('share.copyLink')}</button>
                {[['whatsapp', links.whatsapp], ['facebook', links.facebook], ['x', links.x]].map(([key, href]) => (
                  <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={menuItem}>{t(`share.${key}`)}</a>
                ))}
                {menuMsg && <p role="status" className="px-3 pb-1 pt-2 text-sm text-muted">{t(menuMsg)}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      {zoomUrl && (
        <ZoomDialog label={t('share.cardAlt')} closeLabel={t('common.close')} widthClass="max-w-5xl" onClose={closeZoom}>
          {/* on a phone the card is shown at a readable width and can be swiped sideways; larger screens fit it whole */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0" data-testid="zoom-scroller">
            <TiltSurface max={6}>
              <img src={zoomUrl} alt={t('share.cardAlt')} className="w-[165vw] max-w-none rounded-2xl shadow-2xl sm:w-full sm:max-w-full" />
            </TiltSurface>
          </div>
          <p className="mt-3 text-center text-sm text-cream sm:hidden">{t('share.panHint')}</p>
          <p className="mt-3 text-center text-sm text-cream">{t('share.saveHint')}</p>
          <p className="text-center text-sm text-cream/80">{t('dialog.hint')}</p>
        </ZoomDialog>
      )}
    </div>
  )
}
