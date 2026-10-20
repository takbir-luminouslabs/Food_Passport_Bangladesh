/** Smooth-scroll to a step of the home page and move keyboard focus to its heading. */
export function goToStep(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  el.querySelector('h2')?.focus?.({ preventScroll: true })
}
