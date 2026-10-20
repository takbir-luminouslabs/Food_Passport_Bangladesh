const enc = encodeURIComponent

/** Text-only share links for popular networks. Nothing is sent anywhere until the person clicks one. */
export function shareLinks({ text, url }) {
  return {
    whatsapp: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    x: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
  }
}
