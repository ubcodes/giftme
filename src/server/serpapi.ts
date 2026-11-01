// Thin SerpApi client (https://serpapi.com) with a small in-memory cache, so repeated
// searches and link lookups don't spend extra credits.

const cache = new Map<string, { at: number; value: unknown }>()
const TTL_MS = 30 * 60 * 1000

export function serpApiEnabled() {
  return !!process.env.SERPAPI_KEY
}

async function serpApi<T>(params: Record<string, string>): Promise<T> {
  const key = process.env.SERPAPI_KEY
  if (!key) throw new Error('SERPAPI_KEY is not set')
  const cacheKey = JSON.stringify(params)
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T

  const res = await fetch(`https://serpapi.com/search.json?${new URLSearchParams({ ...params, api_key: key })}`, {
    signal: AbortSignal.timeout(20_000),
  })
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  // "No results" comes back as an error; treat it as an empty answer.
  if (json.error && !/hasn't returned any results|no results/i.test(json.error)) throw new Error(`SerpApi: ${json.error}`)
  if (!res.ok && !json.error) throw new Error(`SerpApi HTTP ${res.status}`)
  cache.set(cacheKey, { at: Date.now(), value: json })
  if (cache.size > 500) cache.delete(cache.keys().next().value!)
  return json
}

export type ShoppingResult = {
  product_id?: string
  title?: string
  link?: string
  product_link?: string
  source?: string
  price?: string
  extracted_price?: number
  thumbnail?: string
  serpapi_thumbnail?: string
}

/** Google Shopping. It doesn't cover Nigeria, so this is used for international shops. */
export async function shoppingSearch(query: string, gl = 'us') {
  const json = await serpApi<{ shopping_results?: ShoppingResult[] }>({ engine: 'google_shopping', q: query, gl, hl: 'en' })
  return json.shopping_results ?? []
}

export type OrganicResult = {
  position?: number
  title?: string
  link?: string
  source?: string
  displayed_link?: string
  thumbnail?: string
  rich_snippet?: Record<'top' | 'bottom', { detected_extensions?: { price?: number; currency?: string } } | undefined>
}

/** Regular Google web results, localised (Nigerian shops show up here with naira prices). */
export async function webSearch(query: string, gl = 'ng') {
  const json = await serpApi<{ organic_results?: OrganicResult[] }>({ engine: 'google', q: query, gl, hl: 'en', num: '20' })
  return json.organic_results ?? []
}

/** One Amazon product by ASIN. Amazon blocks ordinary page reads, so links go through here. */
export async function amazonProduct(asin: string, domain: string) {
  const json = await serpApi<{
    product_results?: { title?: string; price?: string; extracted_price?: number; thumbnail?: string; thumbnails?: string[] }
  }>({ engine: 'amazon_product', asin, amazon_domain: domain })
  return json.product_results ?? null
}
