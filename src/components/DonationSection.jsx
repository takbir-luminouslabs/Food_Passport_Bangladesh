import { useState } from 'react'
import ZoomDialog from './ZoomDialog'

/**
 * Voluntary donation block. The number is only shown once one is configured (VITE_BKASH_NUMBER),
 * i.e. after it has been verified. We never ask for a PIN/OTP and never claim a payment was verified.
 */
export default function DonationSection({ t, number }) {
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <section aria-labelledby="donation-title" className="rounded-2xl bg-primary p-5 text-cream">
      <div>
        <h2 id="donation-title" className="text-xl font-bold">{t('donation.title')}</h2>
        <p className="mt-2">{t('donation.body1')}</p>
        <p className="mt-2">{t('donation.body2')}</p>
        <p className="mt-2 font-semibold">{t('donation.optional')}</p>
        <p className="mt-1 text-sm text-lime">{t('donation.safety')}</p>
        {number && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <strong className="select-all text-lg">{number}</strong>
            <button type="button" onClick={copy} className="min-h-11 rounded-full bg-lime px-4 font-semibold text-primary-dark">
              {t('donation.copy')}
            </button>
            {copied && <span role="status">{t('donation.copied')}</span>}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setQrOpen(true)}
        aria-haspopup="dialog"
        className="mt-4 min-h-11 rounded-full bg-lime px-5 font-semibold text-primary-dark"
      >
        {t('donation.showQr')}
      </button>
      {qrOpen && (
        <ZoomDialog label={t('donation.qrLabel')} closeLabel={t('common.close')} widthClass="max-w-sm" onClose={() => setQrOpen(false)}>
          <img src="images/bkash-qr.jpg" alt={t('donation.qrAlt')} width="800" height="800" className="w-full rounded-2xl bg-white" />
        </ZoomDialog>
      )}
    </section>
  )
}
