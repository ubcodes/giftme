import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// Fetching URLs that users paste is a classic way to reach internal services, so every
// outbound fetch of a user-supplied URL goes through here: public http(s) hosts only,
// redirects re-checked hop by hop, a timeout and a size cap.

export const USER_AGENT = 'GiftMeBot/1.0 (+link previews for gift wishlists)'

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::') return true
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

export class FetchBlockedError extends Error {}

async function assertPublic(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new FetchBlockedError('Only web links are supported')
  if (url.username || url.password) throw new FetchBlockedError('Links with passwords are not supported')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new FetchBlockedError('That address is not reachable')
}

export async function safeFetch(
  input: string,
  opts: { accept?: string; maxBytes?: number; timeoutMs?: number } = {},
): Promise<{ url: URL; status: number; contentType: string; body: Buffer }> {
  const maxBytes = opts.maxBytes ?? 3_000_000
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 10_000)
  let url = new URL(input)

  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url)
    const res = await fetch(url, {
      redirect: 'manual',
      signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: opts.accept ?? 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-NG,en;q=0.9',
      },
    })
    const location = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url)
      continue
    }

    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > maxBytes) {
          await reader.cancel()
          break
        }
        chunks.push(value)
      }
    }
    return { url, status: res.status, contentType: res.headers.get('content-type') ?? '', body: Buffer.concat(chunks) }
  }
  throw new FetchBlockedError('Too many redirects')
}

/** Light robots.txt check: honour a site's request not to be fetched by bots. */
export async function robotsAllows(url: URL) {
  try {
    const res = await safeFetch(new URL('/robots.txt', url).toString(), { accept: 'text/plain', maxBytes: 300_000, timeoutMs: 4000 })
    if (res.status >= 400) return true
    return parseRobots(res.body.toString('utf8'), url.pathname + url.search)
  } catch {
    return true
  }
}

function parseRobots(text: string, path: string) {
  // Group rules by user-agent; use our own group if present, otherwise "*".
  const groups = new Map<string, { allow: string[]; disallow: string[] }>()
  let agents: string[] = []
  let lastWasAgent = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'user-agent') {
      if (!lastWasAgent) agents = []
      agents.push(value.toLowerCase())
      for (const a of agents) if (!groups.has(a)) groups.set(a, { allow: [], disallow: [] })
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (key !== 'allow' && key !== 'disallow') continue
    for (const a of agents) groups.get(a)?.[key].push(value)
  }
  const rules = groups.get('giftmebot') ?? groups.get('*')
  if (!rules) return true
  const matches = (pattern: string) => {
    if (!pattern) return -1
    const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'))
    return re.test(path) ? pattern.length : -1
  }
  const allow = Math.max(-1, ...rules.allow.map(matches))
  const disallow = Math.max(-1, ...rules.disallow.map(matches))
  return disallow < 0 || allow >= disallow
}
