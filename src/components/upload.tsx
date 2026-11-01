import { useRef, useState } from 'react'
import { secondaryButton } from '@/lib/ui'

export async function uploadImage(file: File, folder: 'avatars' | 'items' | 'covers') {
  const body = new FormData()
  body.set('file', file)
  body.set('folder', folder)
  const res = await fetch('/api/upload', { method: 'POST', body })
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed. Please try again.')
  return json.url
}

/** A button that opens the file picker, uploads, and hands back the stored URL. */
export function UploadButton({
  folder,
  onUploaded,
  label = 'Upload a photo',
  className = '',
}: {
  folder: 'avatars' | 'items' | 'covers'
  onUploaded: (url: string) => void
  label?: string
  className?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onUploaded(await uploadImage(file, folder))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={pick} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={`min-h-10 px-4 text-sm ${secondaryButton} ${className}`}
      >
        {busy ? 'Uploading…' : label}
      </button>
      {error && <span className="text-xs text-red-700 dark:text-red-400">{error}</span>}
    </span>
  )
}
