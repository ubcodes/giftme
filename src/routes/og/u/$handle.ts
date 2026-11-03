import { createFileRoute } from '@tanstack/react-router'
import { publicProfile } from '@/server/gifts'
import { profileImage } from '@/server/og/render'
import { serveImage } from '@/server/og/serve'

// The link preview for someone's profile page.
export const Route = createFileRoute('/og/u/$handle')({
  server: {
    handlers: {
      GET: ({ params, request }) =>
        serveImage(`u/${params.handle}/${new URL(request.url).searchParams.get('v') ?? ''}`, async () => {
          const data = await publicProfile(params.handle)
          return data ? profileImage({ owner: data.owner, lists: data.wishlists.length }) : null
        }),
    },
  },
})
