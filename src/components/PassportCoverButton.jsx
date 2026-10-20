import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import PassportCover from './PassportCover'
import TiltSurface from './TiltSurface'
import ZoomDialog from './ZoomDialog'

// The cover's printed words are its visible label, so the accessible name starts with them (WCAG 2.5.3 Label in Name).
const COVER_TEXT = 'Bangladesh · বাংলাদেশ Food Passport ফুড পাসপোর্ট'

/** The cover as a button; click floats a large, tiltable copy above the page. */
export default function PassportCoverButton() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${COVER_TEXT}. ${t('passport.cover.enlarge')}`}
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in rounded-[1.4rem] transition-transform hover:-translate-y-1 hover:rotate-1 motion-reduce:transform-none"
      >
        <PassportCover />
      </button>
      {open && (
        <ZoomDialog label={t('passport.cover.label')} closeLabel={t('common.close')} widthClass="max-w-sm" onClose={() => setOpen(false)}>
          <TiltSurface>
            <PassportCover className="w-full shadow-2xl" />
          </TiltSurface>
          <p className="mt-4 text-center text-sm text-cream">{t('dialog.hint')}</p>
        </ZoomDialog>
      )}
    </>
  )
}
