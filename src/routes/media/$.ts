import { createFileRoute } from '@tanstack/react-router'
import { readMedia } from '@/server/storage'

// Serves stored images (files on disk, or rows in the database with IMAGE_STORE=database).
export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = await readMedia(params._splat ?? '')
        if (!file) return new Response('not found', { status: 404 })
        return new Response(new Uint8Array(file.bytes), {
          headers: { 'Content-Type': file.type, 'Cache-Control': 'public, max-age=31536000, immutable' },
        })
      },
    },
  },
})
