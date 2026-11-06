import { Link } from '@tanstack/react-router'
import { Aurora } from '@/components/aurora'
import { ThemeToggle } from '@/components/theme'
import { Logo } from '@/components/ui'
import { glassPrimary, glassSecondary } from '@/lib/ui'

/** Shown for any address that doesn't exist, and for pages someone isn't allowed to see. */
export function NotFound() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Aurora />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
        <nav className="flex items-center justify-between py-5">
          <Logo />
          <ThemeToggle />
        </nav>
        <main className="flex flex-1 flex-col items-center justify-center gap-6 pb-24 text-center">
          <p className="font-display text-[clamp(96px,22vw,220px)] leading-none font-normal tracking-[-0.04em]">
            4
            {/* The script's tails need padding so the gradient covers them. */}
            <span className="font-editorial -my-[0.2em] inline-block bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text px-[0.08em] py-[0.2em] text-[1.3em] text-transparent">
              0
            </span>
            4
          </p>
          <h1 className="font-display -mt-2 text-4xl leading-tight sm:text-5xl">
            This gift got <span className="font-editorial text-5xl sm:text-6xl">lost in the post</span>
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            The page you're looking for isn't here. If someone sent you a wishlist link, check it's complete, or ask them to share it again.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link to="/" className={`inline-flex min-h-12 items-center px-6 text-[15px] ${glassPrimary}`}>
              Back to GiftMe
            </Link>
            <Link to="/start" className={`inline-flex min-h-12 items-center px-5 text-[15px] ${glassSecondary}`}>
              Make your own wishlist
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
