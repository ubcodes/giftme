import { useState } from 'react'
import { primaryButton, secondaryButton } from '@/lib/ui'

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const text = `${title}: ${url}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this link', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="truncate rounded-lg border border-neutral-300/70 bg-white/50 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-700/70 dark:bg-neutral-900/40 dark:text-neutral-400">
        {url.replace(/^https?:\/\//, '')}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={`min-h-10 flex-1 px-3 text-sm ${primaryButton}`}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-10 flex-1 items-center justify-center px-3 text-sm ${secondaryButton}`}
        >
          WhatsApp
        </a>
      </div>
    </div>
  )
}
