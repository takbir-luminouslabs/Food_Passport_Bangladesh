import Emblem from './Emblem'

/**
 * Closed passport cover. Purely decorative: wrap it in a labelled button/dialog.
 * Everything inside is sized in container-width units (cqw), so the cover looks the same at any width and its words
 * can never spill over the edges.
 */
export default function PassportCover({ className = '' }) {
  return (
    <div aria-hidden="true" className={`passport-cover ${className}`}>
      <div className="flex h-full flex-col items-center justify-between px-[7cqw] py-[9cqw] text-center">
        <p className="foil flex items-center gap-[2cqw] whitespace-nowrap text-[3.4cqw] font-bold">
          <span className="uppercase tracking-[0.25em]">Bangladesh</span>{' '}
          <span>·</span>{' '}
          {/* no letter-spacing on Bengali: it would break the conjunct letters apart */}
          <span lang="bn" className="text-[4.4cqw]">বাংলাদেশ</span>
        </p>{' '}
        <Emblem className="foil-icon size-[40cqw]" />{' '}
        <div className="max-w-full">
          <p className="foil font-serif text-[10.5cqw] font-bold uppercase leading-tight tracking-[0.1em]">Food <br />Passport</p>{' '}
          <p className="foil mt-[2cqw] text-[7.5cqw] font-bold leading-tight">ফুড পাসপোর্ট</p>
        </div>
        <span className="passport-chip" />
      </div>
    </div>
  )
}
