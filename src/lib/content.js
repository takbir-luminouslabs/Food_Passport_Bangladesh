const FILES = ['foods', 'categories', 'challenges', 'badges']

/** Fetch the static catalogue. `baseUrl` follows Vite's BASE_URL so it works on GitHub Pages sub-paths. */
export async function loadContent(
  fetchFn = (...args) => globalThis.fetch(...args),
  baseUrl = import.meta.env.BASE_URL,
) {
  const entries = await Promise.all(
    FILES.map(async (name) => {
      const res = await fetchFn(`${baseUrl}data/${name}.json`)
      if (!res.ok) throw new Error(`Failed to load ${name}.json (HTTP ${res.status})`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error(`Invalid ${name}.json: expected an array`)
      return [name, data]
    }),
  )
  return Object.fromEntries(entries)
}
