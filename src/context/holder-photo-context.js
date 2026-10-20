import { createContext, useContext } from 'react'

export const HolderPhotoContext = createContext(null)

/** { name, setName, canvas, url, setFromFile(file) -> { ok } | { ok:false, reason }, clear() }. Held in memory only. */
export function useHolderPhoto() {
  const ctx = useContext(HolderPhotoContext)
  if (!ctx) throw new Error('useHolderPhoto must be used inside <HolderPhotoProvider>')
  return ctx
}
