import { createFileRoute } from '@tanstack/react-router'
import { currentUserId } from '@/server/auth'
import { MAX_IMAGE_BYTES, isSupportedImage, saveImage } from '@/server/storage'

const FOLDERS = new Set(['avatars', 'items', 'covers'])

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await currentUserId())) return Response.json({ error: 'Please sign in first.' }, { status: 401 })
        const form = await request.formData()
        const file = form.get('file')
        const folder = String(form.get('folder') ?? 'items')
        if (!(file instanceof File) || !FOLDERS.has(folder)) return Response.json({ error: 'No image received.' }, { status: 400 })
        if (!isSupportedImage(file.type)) return Response.json({ error: 'Please use a JPG, PNG, WebP or GIF image.' }, { status: 400 })
        if (file.size > MAX_IMAGE_BYTES) return Response.json({ error: 'That image is over 6 MB.' }, { status: 400 })
        const url = await saveImage(folder, Buffer.from(await file.arrayBuffer()), file.type)
        return Response.json({ url })
      },
    },
  },
})
