/** Open Graph and Twitter tags, so a shared link shows a picture, title and description. */
export function shareMeta(opts: { siteUrl: string; title: string; description: string; image?: string | null; path?: string }) {
  const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : `${opts.siteUrl}${url.startsWith('/') ? '' : '/'}${url}`)
  const image = absolute(opts.image || '/og.png')
  return [
    { property: 'og:site_name', content: 'GiftMe' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: opts.title },
    { property: 'og:description', content: opts.description },
    { property: 'og:image', content: image },
    ...(opts.path ? [{ property: 'og:url', content: absolute(opts.path) }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: opts.title },
    { name: 'twitter:description', content: opts.description },
    { name: 'twitter:image', content: image },
  ]
}
