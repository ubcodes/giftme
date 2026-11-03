import { createFileRoute } from '@tanstack/react-router'
import { siteImage } from '@/server/og/render'
import { serveImage } from '@/server/og/serve'

// The site-wide link preview. public/og.jpg is a saved copy of this; refresh it after design changes.
export const Route = createFileRoute('/og/site')({
  server: { handlers: { GET: () => serveImage('site', siteImage) } },
})
