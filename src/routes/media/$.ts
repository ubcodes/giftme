import { createFileRoute } from '@tanstack/react-router'
import { readLocalMedia } from '@/server/storage'

// Serves images saved by the local image store.
export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = await readLocalMedia(params._splat ?? '')
        if (!file) return new Response('not found', { status: 404 })
        return new Response(new Uint8Array(file.bytes), {
          headers: { 'Content-Type': file.type, 'Cache-Control': 'public, max-age=31536000, immutable' },
        })
      },
    },
  },
})
