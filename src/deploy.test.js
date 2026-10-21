import { existsSync, readFileSync } from 'node:fs'

const workflow = () => readFileSync('.github/workflows/deploy.yml', 'utf8')

describe('GitHub Pages deployment', () => {
  test('a workflow exists and builds, tests and deploys with the official Pages actions', () => {
    expect(existsSync('.github/workflows/deploy.yml')).toBe(true)
    const w = workflow()
    for (const needle of ['actions/checkout@', 'actions/setup-node@', 'npm ci', 'npm run lint', 'npm test', 'npm run db:test', 'npm run build', 'actions/configure-pages@', 'actions/upload-pages-artifact@', 'actions/deploy-pages@']) {
      expect(w, needle).toContain(needle)
    }
  })

  test('has the permissions Pages needs and nothing broader', () => {
    const w = workflow()
    expect(w).toMatch(/pages:\s*write/)
    expect(w).toMatch(/id-token:\s*write/)
    expect(w).toMatch(/contents:\s*read/)
    expect(w).not.toMatch(/contents:\s*write/)
  })

  test('sets the Vite base from the repository name, so sub-path hosting works', () => {
    expect(workflow()).toMatch(/VITE_BASE:\s*\/\$\{\{\s*github\.event\.repository\.name\s*\}\}\//)
  })

  test('public settings come from repository variables (never secrets: they end up in the public bundle)', () => {
    const w = workflow()
    expect(w).toContain('vars.BKASH_NUMBER')
    expect(w).toContain('vars.SITE_URL')
    expect(w).toContain('vars.SUPABASE_URL')
    expect(w).toContain('vars.SUPABASE_PUBLISHABLE_KEY')
    expect(w).not.toContain('secrets.')
  })

  test('only one deployment runs at a time and a failed build never deploys', () => {
    const w = workflow()
    expect(w).toMatch(/concurrency:/)
    expect(w).toMatch(/needs:\s*build/)
  })
})

describe('index.html', () => {
  const html = () => readFileSync('index.html', 'utf8')
  test('has a description, theme colour and a no-JavaScript message', () => {
    expect(html()).toMatch(/<meta name="description" content="[^"]{20,}"/)
    expect(html()).toMatch(/<meta name="theme-color"/)
    expect(html()).toMatch(/<noscript>/)
  })
})
