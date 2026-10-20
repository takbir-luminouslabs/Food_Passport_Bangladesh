import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { processPhoto } from '../utils/photo'
import { HolderPhotoContext } from './holder-photo-context'

/**
 * The optional holder name and photo, shared by the passport book and the share card. Memory only: never written
 * to storage or sent anywhere, so a reload forgets them.
 */
export function HolderPhotoProvider({ children }) {
  const [photo, setPhoto] = useState(null) // { canvas, url }
  const [name, setName] = useState('')
  const urlRef = useRef(null)

  const release = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])
  useEffect(() => release, [release])

  const setFromFile = useCallback(async (file) => {
    try {
      const canvas = await processPhoto(file)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) return { ok: false, reason: 'read' }
      release()
      urlRef.current = URL.createObjectURL(blob)
      setPhoto({ canvas, url: urlRef.current })
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: e?.reason ?? 'read' }
    }
  }, [release])

  const clear = useCallback(() => {
    release()
    setPhoto(null)
  }, [release])

  const value = useMemo(
    () => ({ name, setName, canvas: photo?.canvas ?? null, url: photo?.url ?? null, setFromFile, clear }),
    [name, photo, setFromFile, clear],
  )
  return <HolderPhotoContext.Provider value={value}>{children}</HolderPhotoContext.Provider>
}
