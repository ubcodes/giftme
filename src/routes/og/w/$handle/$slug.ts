import { createFileRoute } from '@tanstack/react-router'
import { publicWishlist } from '@/server/gifts'
import { wishlistImage } from '@/server/og/render'
import { serveImage } from '@/server/og/serve'

// The link preview for one wishlist: its banner or gift photos, title, date and countdown.
export const Route = createFileRoute('/og/w/$handle/$slug')({
  server: {
    handlers: {
      GET: ({ params, request }) =>
        serveImage(`w/${params.handle}/${params.slug}/${new URL(request.url).searchParams.get('v') ?? ''}`, async () => {
          const data = await publicWishlist(params.handle, params.slug)
          return data ? wishlistImage(data) : null
        }),
    },
  },
})
