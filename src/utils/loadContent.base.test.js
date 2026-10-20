import { loadContent } from '../lib/content'

test('data files are fetched under the Vite base path, so GitHub Pages sub-paths work', async () => {
  const urls = []
  const fetchFn = async (url) => {
    urls.push(url)
    return { ok: true, status: 200, json: async () => [] }
  }
  await loadContent(fetchFn, '/food-passport-bangladesh/')
  expect(urls.sort()).toEqual(['foods', 'categories', 'challenges', 'badges', 'quiz'].sort().map((n) => `/food-passport-bangladesh/data/${n}.json`).sort())
})
