import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Glow } from '@/components/ui'

export const CONTACT_EMAIL = 'etopessienemmanuella@gmail.com'
export const LEGAL_UPDATED = '3 November 2026'

/** Shared layout for the privacy policy and terms pages. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <main className="relative mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
        <Link to="/" className="text-sm text-neutral-500 underline underline-offset-4">
          ← GiftMe
        </Link>
        <header>
          <h1 className="font-display text-5xl text-neutral-900 dark:text-neutral-100">{title}</h1>
          <p className="mt-2 text-sm text-neutral-500">Last updated {LEGAL_UPDATED}</p>
        </header>
        <div className="flex flex-col gap-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-neutral-900 dark:[&_h2]:text-neutral-100 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
      </main>
    </div>
  )
}
