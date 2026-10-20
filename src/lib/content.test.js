import { readFileSync } from 'node:fs'
import { loadContent } from './content'

const diskFetch = async (url) => {
  const name = String(url).match(/data\/(\w+)\.json$/)?.[1]
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8')) }
}

test('loads all four content files using the Vite base path', async () => {
  const urls = []
  const content = await loadContent(async (u) => { urls.push(u); return diskFetch(u) }, '/food-passport-bangladesh/')
  expect(Object.keys(content).sort()).toEqual(['badges', 'categories', 'challenges', 'foods'])
  expect(content.foods.length).toBeGreaterThan(60)
  expect(urls.sort()).toEqual([
    '/food-passport-bangladesh/data/badges.json',
    '/food-passport-bangladesh/data/categories.json',
    '/food-passport-bangladesh/data/challenges.json',
    '/food-passport-bangladesh/data/foods.json',
  ])
})

test('rejects on HTTP errors', async () => {
  await expect(loadContent(async () => ({ ok: false, status: 404 }), '/')).rejects.toThrow(/404/)
})

test('rejects on network failure', async () => {
  await expect(loadContent(async () => { throw new Error('offline') }, '/')).rejects.toThrow(/offline/)
})

test('rejects when a file is not an array', async () => {
  await expect(loadContent(async () => ({ ok: true, json: async () => ({}) }), '/')).rejects.toThrow(/invalid/i)
})
