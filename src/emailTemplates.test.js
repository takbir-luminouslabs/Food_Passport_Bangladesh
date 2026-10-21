import { readFileSync } from 'node:fs'

const files = ['magic-link', 'confirm-signup']

describe.each(files)('email template %s', (name) => {
  const html = readFileSync(`supabase/email-templates/${name}.html`, 'utf8')
  test('keeps the placeholders Supabase fills in', () => {
    expect(html).toContain('{{ .ConfirmationURL }}')
    expect(html).toContain('{{ .Email }}')
    expect(html).toContain('{{ .SiteURL }}')
  })
  test('has both languages, no leftover template slots, no scripts, no remote images', () => {
    expect(html).toMatch(/[ঀ-৿]/)
    expect(html).not.toMatch(/__[A-Z_]+__/)
    expect(html).not.toMatch(/<script|<img|<link|@import/i)
  })
  test('the sign-in button points at the link and there is a plain-text fallback', () => {
    expect(html.match(/href="\{\{ \.ConfirmationURL \}\}"/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
