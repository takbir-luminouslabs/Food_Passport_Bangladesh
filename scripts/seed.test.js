import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { buildSeed, loadCatalogue } from './seed.mjs'

test('supabase/seed.sql is up to date with the static catalogue (run `npm run db:seed` if this fails)', () => {
  expect(readFileSync('supabase/seed.sql', 'utf8')).toBe(buildSeed(loadCatalogue()))
})

test('the seed escapes quotes and carries every food, challenge and badge', () => {
  const sql = buildSeed({
    foods: [{ id: 'x', name_bn: 'ক', name_en: "Cox's Bazar", description_bn: 'ক', description_en: 'd', category: 'c', scope: 'regional', region: { district_en: "Cox's Bazar", district_bn: 'ক', division: 'Chattogram' }, xp: 10, image_url: null, image_attribution: null, source_url: null, verification_status: 'unverified', association_confidence: 'medium' }],
    challenges: [], badges: [],
  })
  expect(sql).toContain("'Cox''s Bazar'")
  expect(sql).toContain('on conflict (id) do update')
  const { foods, challenges, badges } = loadCatalogue()
  const seed = readFileSync('supabase/seed.sql', 'utf8')
  for (const row of [...foods, ...challenges, ...badges]) expect(seed).toContain(`('${row.id}',`)
})

test('the migration switches on row level security for every table it creates', () => {
  const sql = readFileSync('supabase/migrations/20261021000001_init_schema.sql', 'utf8')
  const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1])
  expect(tables.length).toBeGreaterThanOrEqual(9)
  for (const t of tables) expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`))
})
