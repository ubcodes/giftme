import { FetchBlockedError, robotsAllows, safeFetch } from './net'
import { UserError } from './errors'

// Reads the details a shop publishes about its own product page: JSON-LD `Product` data,
// OpenGraph and standard meta tags. These exist so that links preview nicely; we read them
// the same way a chat app does, honour robots.txt, and never crawl beyond the one page.

export type ProductDraft = {
  title: string | null
  imageUrl: string | null
  priceNgn: number | null
  priceUsd: number | null
  /** Price in another currency we couldn't convert, shown so the user can enter it. */
  originalPrice: string | null
  link: string
  siteName: string | null
}

export function usdRate() {
  const rate = Number(process.env.USD_NGN_RATE ?? 1500)
  return Number.isFinite(rate) && rate > 0 ? rate : 1500
}

export function toNaira(amount: number, currency: string | null): { priceNgn: number | null; priceUsd: number | null } {
  const cur = (currency ?? 'NGN').toUpperCase()
  if (!Number.isFinite(amount) || amount <= 0) return { priceNgn: null, priceUsd: null }
  if (cur === 'NGN' || cur === '₦') return { priceNgn: Math.round(amount), priceUsd: null }
  if (cur === 'USD' || cur === '$') return { priceNgn: Math.round(amount * usdRate()), priceUsd: Math.round(amount * 100) / 100 }
  return { priceNgn: null, priceUsd: null }
}

/** "₦12,500.00" / "$1,299.99" / "NGN 4500" → amount + currency. */
export function parsePriceText(text: string | null | undefined): { amount: number; currency: string | null } | null {
  if (!text) return null
  const currency = /₦|NGN|naira/i.test(text) ? 'NGN' : /\$|USD/i.test(text) ? 'USD' : /£|GBP/.test(text) ? 'GBP' : /€|EUR/.test(text) ? 'EUR' : null
  const m = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  if (!m) return null
  return { amount: Number(m[0]), currency }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

function decode(s: string) {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAttrs(tag: string) {
  const attrs: Record<string, string> = {}
  for (const m of tag.matchAll(/([a-zA-Z_:.-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? '')
  }
  return attrs
}

type JsonLdProduct = { name?: string; image?: unknown; offers?: unknown }

function findProducts(node: unknown, out: JsonLdProduct[] = []): JsonLdProduct[] {
  if (Array.isArray(node)) node.forEach((n) => findProducts(n, out))
  else if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const type = obj['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.some((t) => typeof t === 'string' && /^(Product|ProductGroup|IndividualProduct)$/i.test(t))) out.push(obj as JsonLdProduct)
    if (obj['@graph']) findProducts(obj['@graph'], out)
    if (obj.mainEntity) findProducts(obj.mainEntity, out)
  }
  return out
}

function firstImage(image: unknown): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return firstImage(image[0])
  if (typeof image === 'object') {
    const o = image as Record<string, unknown>
    return (typeof o.url === 'string' && o.url) || (typeof o.contentUrl === 'string' && o.contentUrl) || null
  }
  return null
}

function offerPrice(offers: unknown): { amount: number; currency: string | null } | null {
  if (!offers) return null
  if (Array.isArray(offers)) {
    for (const o of offers) {
      const p = offerPrice(o)
      if (p) return p
    }
    return null
  }
  if (typeof offers !== 'object') return null
  const o = offers as Record<string, unknown>
  const currency = typeof o.priceCurrency === 'string' ? o.priceCurrency : null
  const raw = o.price ?? o.lowPrice ?? (o.priceSpecification as Record<string, unknown> | undefined)?.price
  const amount = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.replace(/,/g, '')) : NaN
  if (Number.isFinite(amount) && amount > 0) return { amount, currency }
  return o.offers ? offerPrice(o.offers) : null
}

export function extractProduct(html: string, pageUrl: URL): ProductDraft {
  const head = html.slice(0, 1_500_000)
  const meta: Record<string, string> = {}
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = parseAttrs(m[0])
    const key = (a.property ?? a.name ?? a.itemprop ?? '').toLowerCase()
    if (key && a.content && !(key in meta)) meta[key] = a.content
  }
  let canonical: string | null = null
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const a = parseAttrs(m[0])
    if (a.rel?.toLowerCase() === 'canonical' && a.href) canonical = a.href
  }

  const products: JsonLdProduct[] = []
  for (const m of head.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      findProducts(JSON.parse(m[1].trim()), products)
    } catch {
      // Some shops publish slightly broken JSON-LD; skip it and fall back to meta tags.
    }
  }
  const product = products[0]

  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const title =
    (product?.name && decode(String(product.name))) || meta['og:title'] || meta['twitter:title'] || (titleTag ? decode(titleTag) : null)

  const rawImage = firstImage(product?.image) || meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || meta['image']
  let imageUrl: string | null = null
  try {
    imageUrl = rawImage ? new URL(rawImage, pageUrl).toString() : null
  } catch {
    imageUrl = null
  }

  const price =
    offerPrice(product?.offers) ??
    (meta['product:price:amount'] || meta['og:price:amount']
      ? {
          amount: Number((meta['product:price:amount'] ?? meta['og:price:amount']).replace(/,/g, '')),
          currency: meta['product:price:currency'] ?? meta['og:price:currency'] ?? null,
        }
      : meta['price']
        ? { amount: Number(meta['price'].replace(/,/g, '')), currency: meta['pricecurrency'] ?? meta['pricecurrency'] ?? null }
        : null)

  const converted = price ? toNaira(price.amount, price.currency) : { priceNgn: null, priceUsd: null }
  let link = pageUrl.toString()
  try {
    if (canonical) link = new URL(canonical, pageUrl).toString()
    else if (meta['og:url']) link = new URL(meta['og:url'], pageUrl).toString()
  } catch {
    // keep the URL we fetched
  }

  // Bot-check and error pages often carry only the shop's name; that's not a product title.
  const siteName = meta['og:site_name'] ?? pageUrl.hostname.replace(/^www\./, '')
  const generic = !product && !price && !!title && [siteName, pageUrl.hostname.replace(/^www\./, '').split('.')[0]].some(
    (s) => s.toLowerCase() === title.toLowerCase(),
  )

  return {
    title: title && !generic ? title.slice(0, 200) : null,
    imageUrl: generic ? null : imageUrl,
    priceNgn: converted.priceNgn,
    priceUsd: converted.priceUsd,
    originalPrice: price && converted.priceNgn === null ? `${price.currency ?? ''} ${price.amount}`.trim() : null,
    link,
    siteName,
  }
}

export async function previewLink(input: string): Promise<ProductDraft> {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`)
  } catch {
    throw new UserError("That doesn't look like a link. Copy it from the shop's address bar.")
  }
  if (!(await robotsAllows(url))) {
    throw new UserError("This shop asks apps not to read its pages, so please fill in the details yourself.")
  }
  let res
  try {
    res = await safeFetch(url.toString())
  } catch (err) {
    if (err instanceof FetchBlockedError) throw new UserError(err.message)
    throw new UserError("We couldn't open that page. You can still add the details yourself.")
  }
  if (res.status >= 400) throw new UserError(`The shop didn't let us in (error ${res.status}). You can still add the details yourself.`)
  if (!/html|xml/i.test(res.contentType)) throw new UserError("That link isn't a product page.")
  const draft = extractProduct(res.body.toString('utf8'), res.url)
  return { ...draft, link: draft.link || url.toString() }
}
