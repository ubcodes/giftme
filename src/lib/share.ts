/** Open Graph and Twitter tags, so a shared link shows a picture, title and description. */
export function shareMeta(opts: { siteUrl: string; title: string; description: string; image?: string | null; path?: string }) {
  const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : `${opts.siteUrl}${url.startsWith('/') ? '' : '/'}${url}`)
  const image = absolute(opts.image || '/og.jpg')
  return [
    { property: 'og:site_name', content: 'GiftMe' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: opts.title },
    { property: 'og:description', content: opts.description },
    { property: 'og:image', content: image },
    // Our preview pictures are all 1200 × 630; saying so lets WhatsApp and others show them sooner.
    ...(opts.image && /^https?:/.test(opts.image) ? [] : [
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
    ]),
    ...(opts.path ? [{ property: 'og:url', content: absolute(opts.path) }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: opts.title },
    { name: 'twitter:description', content: opts.description },
    { name: 'twitter:image', content: image },
  ]
}

/** A short fingerprint of what a preview picture shows, so apps fetch it again when it changes. */
export function previewVersion(parts: unknown[]) {
  let h = 5381
  for (const ch of JSON.stringify(parts)) h = ((h << 5) + h + ch.charCodeAt(0)) | 0
  return (h >>> 0).toString(36)
}
