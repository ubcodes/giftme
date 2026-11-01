import { UserError } from './errors'
import { USER_AGENT } from './net'
import { parsePriceText, readProductPage, toNaira } from './products'
import { immersiveProduct, serpApiEnabled, shoppingSearch, webSearch, type OrganicResult } from './serpapi'

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
  region: 'ng' | 'intl'
  /** Set when `link` is missing: exchange it for the shop's own link with resolveShopLink. */
  resolveToken?: string
}

export interface ProductSearchProvider {
  name: string
  search(query: string): Promise<ProductResult[]>
}

// Sites that come up in web results but aren't shops.
const NOT_SHOPS = /(^|\.)(google\.|facebook\.com|instagram\.com|youtube\.com|tiktok\.com|wikipedia\.org|nairaland\.com|reddit\.com|pinterest\.)/i

/** Google wraps shop links in a click-through redirect; read where it points (one request, no body). */
export async function unwrapGoogleLink(link: string) {
  const url = new URL(link)
  if (!/(^|\.)google\.com$/.test(url.hostname) || !['/goto', '/url'].includes(url.pathname)) return link
  try {
    const res = await fetch(link, { redirect: 'manual', signal: AbortSignal.timeout(4000), headers: { 'User-Agent': USER_AGENT } })
    const location = res.headers.get('location')
    return location ? new URL(location, link).toString() : null
  } catch {
    return null
  }
}

function snippetPrice(r: OrganicResult) {
  for (const part of [r.rich_snippet?.top, r.rich_snippet?.bottom]) {
    const ext = part?.detected_extensions
    if (ext?.price && (!ext.currency || ext.currency === '₦' || ext.currency === 'NGN')) return Math.round(ext.price)
  }
  return null
}

/**
 * SerpApi. Google Shopping doesn't cover Nigeria, so Nigerian shops come from Google web
 * results (with naira prices), topped up with each shop page's own photo and price.
 * International shops come from Google Shopping (US), converted to naira.
 */
class SerpApiProducts implements ProductSearchProvider {
  name = 'serpapi'

  private async nigeria(query: string): Promise<ProductResult[]> {
    const organic = await webSearch(`${query} price in Nigeria`, 'ng')
    const results = await Promise.all(
      organic.slice(0, 10).map(async (r, i): Promise<ProductResult | null> => {
        const link = r.link ? await unwrapGoogleLink(r.link) : null
        if (!link) return null
        const host = new URL(link).hostname
        if (NOT_SHOPS.test(host)) return null
        // Shop listings and guides have no single price; skip anything without one.
        const page = await readProductPage(link)
        const priceNgn = page?.priceNgn ?? snippetPrice(r)
        if (!priceNgn) return null
        return {
          id: `ng-${i}`,
          title: page?.title ?? r.title ?? 'Product',
          imageUrl: page?.imageUrl ?? r.thumbnail ?? null,
          priceNgn,
          priceUsd: null,
          priceText: null,
          link: page?.link ?? link,
          source: r.source ?? page?.siteName ?? null,
          region: 'ng',
        }
      }),
    )
    return results.filter((r): r is ProductResult => r !== null)
  }

  private async international(query: string): Promise<ProductResult[]> {
    const shopping = await shoppingSearch(query, 'us')
    return shopping.slice(0, 16).map((r, i) => {
      const parsed = parsePriceText(r.price)
      const { priceNgn, priceUsd } = toNaira(parsed?.amount ?? r.extracted_price ?? NaN, parsed?.currency ?? 'USD')
      return {
        id: r.product_id ?? `intl-${i}`,
        title: r.title ?? 'Product',
        imageUrl: r.serpapi_thumbnail ?? r.thumbnail ?? null,
        priceNgn,
        priceUsd,
        priceText: r.price ?? null,
        // Google's product pages need a consent screen, so only keep a direct shop link here.
        link: r.link && !/google\./.test(new URL(r.link).hostname) ? r.link : null,
        resolveToken: r.immersive_product_page_token,
        source: r.source ?? null,
        region: 'intl' as const,
      }
    })
  }

  async search(query: string) {
    const [ng, intl] = await Promise.allSettled([this.nigeria(query), this.international(query)])
    if (ng.status === 'rejected' && intl.status === 'rejected') {
      console.error('[search] failed', ng.reason, intl.reason)
      throw new UserError('Search is having a moment. Try pasting a link instead.')
    }
    return [...(ng.status === 'fulfilled' ? ng.value : []), ...(intl.status === 'fulfilled' ? intl.value : [])]
  }
}

/** Finds the shop's own link for an international result, preferring the shop that was shown. */
export async function resolveShopLink(token: string, source: string | null) {
  const stores = (await immersiveProduct(token)).filter((s) => s.link)
  const store = stores.find((s) => source && s.name?.toLowerCase().includes(source.toLowerCase())) ?? stores[0]
  if (!store?.link) return null
  const link = await unwrapGoogleLink(new URL(store.link, 'https://www.google.com').toString())
  return link && !/(^|\.)google\./.test(new URL(link).hostname) ? link : null
}

export function searchProvider(): ProductSearchProvider | null {
  return serpApiEnabled() ? new SerpApiProducts() : null
}
