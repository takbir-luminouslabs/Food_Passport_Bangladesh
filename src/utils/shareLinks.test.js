import { shareLinks } from './shareLinks'

const text = 'আমি ৩টি স্ট্যাম্প পেয়েছি! & more'
const url = 'https://example.com/fp/?a=1&b=2'

test('builds WhatsApp, Facebook and X links with the text and URL safely encoded', () => {
  const l = shareLinks({ text, url })
  expect(l.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`)
  expect(l.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
  expect(l.x).toBe(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
})

test('every link is https to a known host, so nothing else can be injected', () => {
  const hosts = Object.values(shareLinks({ text: '"><script>', url: 'javascript:alert(1)' })).map((u) => new URL(u).host)
  expect(hosts).toEqual(['wa.me', 'www.facebook.com', 'twitter.com'])
})
