import { useApp } from '../context/app-context'
import PassportCoverButton from './PassportCoverButton'

// A few of the most photogenic foods, laid out like prints on a table. Position and tilt are fixed (no randomness).
const PRINTS = [
  ['chandpur-ilish', 'left-[4%] top-[7%] w-[29%] -rotate-6'],
  ['gazipur-kathal', 'left-[36%] top-[3%] w-[27%] rotate-3'],
  ['rangamati-pahari-pineapple', 'left-[67%] top-[9%] w-[28%] -rotate-3'],
  ['cumilla-matribhandar-roshmalai', 'left-[5%] top-[53%] w-[27%] rotate-4'],
  ['patuakhali-tormuj', 'left-[68%] top-[52%] w-[27%] rotate-6'],
  ['sabitri-sandesh', 'left-[36%] top-[62%] w-[26%] -rotate-2'],
]

/** Decorative hero art: real food photos on a green panel with the passport cover in front. */
export default function HeroCollage() {
  const { content } = useApp()
  const byId = new Map(content.foods.map((f) => [f.id, f]))
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-xl overflow-hidden rounded-2xl bg-primary shadow-lg">
      <div aria-hidden="true" className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_50%_40%,#fff_0,transparent_60%)]" />
      {PRINTS.map(([id, pos]) => {
        const food = byId.get(id)
        if (!food?.image_url) return null
        return (
          <div key={id} aria-hidden="true" data-print={id} className={`absolute rounded-sm bg-white p-[1.8%] pb-[4%] shadow-md ${pos}`}>
            <img src={food.image_url} alt="" decoding="async" className="aspect-square w-full object-cover" />
          </div>
        )
      })}
      <div className="absolute left-[35%] top-[22%] w-[30%]">
        <PassportCoverButton />
      </div>
    </div>
  )
}
