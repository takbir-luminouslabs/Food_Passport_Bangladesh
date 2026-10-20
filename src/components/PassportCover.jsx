import Emblem from './Emblem'

/** Closed passport cover. Purely decorative: wrap it in a labelled button/dialog. */
export default function PassportCover({ className = '' }) {
  return (
    <div aria-hidden="true" className={`passport-cover flex flex-col items-center justify-between px-5 py-7 text-center ${className}`}>
      <p className="foil flex items-center gap-2 text-[0.65rem] font-bold">
        <span className="uppercase tracking-[0.3em]">Bangladesh</span>{' '}
        <span>·</span>{' '}
        {/* no letter-spacing on Bengali: it would break the conjunct letters apart */}
        <span lang="bn" className="text-xs">বাংলাদেশ</span>
      </p>{' '}
      <Emblem className="foil-icon h-24 w-24 sm:h-28 sm:w-28" />{' '}
      <div>
        <p className="foil font-serif text-2xl font-bold uppercase leading-tight tracking-[0.18em]">Food <br />Passport</p>{' '}
        <p className="foil mt-2 text-lg font-bold">ফুড পাসপোর্ট</p>
      </div>
      <span className="passport-chip" />
    </div>
  )
}
