// Small in-memory cache so a link shared in a busy group chat is drawn once, not per preview.
const cache = new Map<string, { at: number; body: Buffer }>()
const FRESH_MS = 10 * 60 * 1000

export async function serveImage(key: string, draw: () => Promise<Buffer | null>) {
  // Only cache in production, so edits show straight away while developing.
  const hit = import.meta.env.PROD ? cache.get(key) : undefined
  let body = hit && Date.now() - hit.at < FRESH_MS ? hit.body : null
  if (!body) {
    body = await draw()
    if (!body) return new Response('not found', { status: 404 })
    cache.set(key, { at: Date.now(), body })
    if (cache.size > 200) cache.delete(cache.keys().next().value!)
  }
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400' },
  })
}
