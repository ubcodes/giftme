import { UserError } from './errors'
import { parsePriceText, toNaira } from './products'

// Product search sits behind this interface so the provider can change (SerpApi today;
// a shop's affiliate API or another search API later) without touching the UI.

export type ProductResult = {
  id: string
  title: string
  imageUrl: string | null
  priceNgn: number | null
  priceUsd: number | null
  priceText: string | null
  link: string | null
  source: string | null
}

export interface ProductSearchProvider {
  name: string
  search(query: string): Promise<ProductResult[]>
}

type SerpShoppingResult = {
  position?: number
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

/** SerpApi's Google Shopping engine, localised to Nigeria. https://serpapi.com/google-shopping-api */
class SerpApiShopping implements ProductSearchProvider {
  name = 'serpapi'
  constructor(private key: string) {}

  async search(query: string) {
    const params = new URLSearchParams({ engine: 'google_shopping', q: query, gl: 'ng', hl: 'en', api_key: this.key })
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15_000) })
    const json = (await res.json().catch(() => ({}))) as { shopping_results?: SerpShoppingResult[]; error?: string }
    if (!res.ok || json.error) {
      if (json.error && /hasn't returned any results/i.test(json.error)) return []
      console.error('[search] serpapi failed', res.status, json.error)
      throw new UserError('Search is having a moment. Try pasting a link instead.')
    }
    return (json.shopping_results ?? []).slice(0, 24).map((r, i): ProductResult => {
      const parsed = parsePriceText(r.price)
      const amount = parsed?.amount ?? r.extracted_price ?? NaN
      const { priceNgn, priceUsd } = toNaira(amount, parsed?.currency ?? 'NGN')
      return {
        id: r.product_id ?? `${i}`,
        title: r.title ?? 'Untitled product',
        imageUrl: r.serpapi_thumbnail ?? r.thumbnail ?? null,
        priceNgn,
        priceUsd,
        priceText: r.price ?? null,
        link: r.link ?? r.product_link ?? null,
        source: r.source ?? null,
      }
    })
  }
}

export function searchProvider(): ProductSearchProvider | null {
  const key = process.env.SERPAPI_KEY
  return key ? new SerpApiShopping(key) : null
}
