import { useEffect, useState } from 'react'
import { Aurora } from '@/components/aurora'
import { Film } from '@/components/film'
import { GiftScene, preloadGiftScene } from '@/components/lazy-gift-scene'
import { ShareButtons } from '@/components/share'
import { ThemeToggle } from '@/components/theme'
import { ErrorText, Logo, glassCard } from '@/components/ui'
import { glassPrimary, glassSecondary, inputClass } from '@/lib/ui'
import { getWaitlistStandingFn, joinWaitlistFn } from '@/server/fns/waitlist'
import type { Standing } from '@/server/waitlist'

const SAVED = 'gm-waitlist'

const PROMISES = [
  { title: 'Paste any link', body: 'Jumia, Amazon, a small shop on Instagram. We fill in the photo and price.' },
  { title: 'Friends chip in', body: 'Any amount in naira, or reserve a gift to buy it themselves. No awkward asks.' },
  { title: 'Straight to your bank', body: "Every gift settles to your account. GiftMe never holds your money." },
]

/**
 * The pre-launch homepage (PRELAUNCH=1): join the waitlist, see your place, and share an
 * invite link that moves you up the line. Your code is remembered so coming back shows it.
 */
export function Waitlist(props: { count: number; referral?: string; pending?: boolean; signedIn: boolean; hasProfile: boolean }) {
  const [standing, setStanding] = useState<Standing | null>(null)
  const [scene, setScene] = useState<{ still: boolean; compact: boolean } | null>(null)
  const [closed] = useState(() => ({ current: 0 }))

  useEffect(() => {
    const probe = document.createElement('canvas')
    if (probe.getContext('webgl2') || probe.getContext('webgl')) {
      void preloadGiftScene()
      setScene({ still: window.matchMedia('(prefers-reduced-motion: reduce)').matches, compact: window.innerWidth < 768 })
    }
    let code: string | null = null
    try {
      code = localStorage.getItem(SAVED)
    } catch {}
    if (code) getWaitlistStandingFn({ data: { code } }).then((r) => r.standing && setStanding(r.standing)).catch(() => {})
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Aurora />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <nav className="flex items-center justify-between py-5">
          <Logo />
          <div className="flex items-center gap-2.5">
            <a href={props.hasProfile ? '/dashboard' : '/start'} className={`inline-flex min-h-10 items-center px-4 text-sm ${glassSecondary}`}>
              {props.hasProfile ? 'Your wishlists' : 'Sign in'}
            </a>
            <ThemeToggle />
          </div>
        </nav>

        <main className="grid items-center gap-6 pt-6 pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12 lg:pt-14">
          <div className="flex flex-col gap-6">
            <p className={`inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ${glassCard}`}>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-purple-500" />
              </span>
              Opening soon{props.count > 0 && ` · ${props.count.toLocaleString()} ${props.count === 1 ? 'person' : 'people'} waiting`}
            </p>
            <h1 className="font-display text-[clamp(44px,7.5vw,104px)] leading-[0.9] font-normal tracking-[-0.02em]">
              The wishlist friends can{' '}
              {/* Padding covers the script's tails, which the gradient would otherwise cut off. */}
              <span className="font-editorial -my-[0.25em] inline-block bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text py-[0.25em] pr-[0.1em] text-[1.15em] text-transparent">
                actually give to
              </span>
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              One link for your birthday, wedding or big day. Friends chip in any amount in naira, and it lands straight in your bank. Join
              the waitlist and we'll let you in soon.
            </p>
            {props.pending && !standing && (
              <p className="max-w-lg rounded-2xl bg-purple-500/10 px-4 py-3 text-sm text-purple-900 dark:text-purple-200">
                You're signed in, but GiftMe isn't open to new accounts just yet. Join the waitlist with the same email and we'll let you in.
              </p>
            )}
            {standing ? <YourPlace standing={standing} /> : <JoinForm referral={props.referral} onJoined={setStanding} />}
          </div>
          <div aria-hidden="true" className="relative -order-1 h-56 sm:h-72 lg:order-none lg:h-[440px]">
            {scene && <GiftScene progress={closed} still={scene.still} active compact={scene.compact} layout="thanks" />}
          </div>
        </main>

        <section className="grid gap-3 pb-20 sm:grid-cols-3">
          {PROMISES.map((p, i) => (
            <div key={p.title} className={`rounded-3xl p-6 ${glassCard}`}>
              <p className="font-editorial text-3xl text-purple-600/80 dark:text-purple-300/80">0{i + 1}</p>
              <p className="font-display mt-2 text-2xl">{p.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{p.body}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-6 pb-24">
          <h2 className="font-display text-4xl leading-none sm:text-5xl">
            A first look, in <span className="font-editorial text-5xl sm:text-6xl">42 seconds</span>
          </h2>
          <Film />
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/80 py-8 text-sm text-neutral-500 dark:border-neutral-800">
          <Logo />
          <div className="flex gap-5">
            <a href="/privacy" className="hover:underline">
              Privacy
            </a>
            <a href="/terms" className="hover:underline">
              Terms
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

function JoinForm({ referral, onJoined }: { referral?: string; onJoined: (s: Standing) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    const res = await joinWaitlistFn({
      data: {
        email: String(form.get('email') ?? ''),
        name: String(form.get('name') ?? '') || undefined,
        ref: referral,
        website: String(form.get('website') ?? '') || undefined,
      },
    }).catch(() => ({ ok: false as const, error: 'Please check your email address and try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    try {
      localStorage.setItem(SAVED, res.standing.code)
    } catch {}
    onJoined(res.standing)
  }

  return (
    <form onSubmit={submit} className={`flex max-w-lg flex-col gap-3 rounded-3xl p-4 sm:p-5 ${glassCard}`}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <input name="name" placeholder="Your first name" autoComplete="given-name" maxLength={80} className={inputClass} aria-label="Your first name" />
        <input name="email" type="email" required placeholder="you@email.com" autoComplete="email" maxLength={200} className={inputClass} aria-label="Email" />
      </div>
      {/* Left empty by people; bots that fill every field get turned away. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <ErrorText>{error}</ErrorText>
      <button type="submit" disabled={busy} className={`min-h-12 px-6 text-[15px] disabled:opacity-60 ${glassPrimary}`}>
        {busy ? 'Saving your spot…' : 'Join the waitlist'}
      </button>
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        {referral ? 'A friend invited you. ' : ''}No spam: one email to confirm, one when it's your turn.
      </p>
    </form>
  )
}

function YourPlace({ standing }: { standing: Standing }) {
  if (standing.admitted) {
    return (
      <div className={`flex max-w-lg flex-col gap-3 rounded-3xl p-6 ${glassCard}`}>
        <p className="font-display text-3xl">You're in 🎉</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Sign in with the email you joined with to make your first wishlist.</p>
        <a href="/start" className={`inline-flex min-h-12 items-center justify-center px-6 text-[15px] ${glassPrimary}`}>
          Sign in
        </a>
      </div>
    )
  }
  return (
    <div className={`flex max-w-lg flex-col gap-4 rounded-3xl p-6 ${glassCard}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Your place in line</p>
          <p className="font-display text-6xl leading-none">#{standing.position.toLocaleString()}</p>
        </div>
        <p className="text-right text-sm text-neutral-600 dark:text-neutral-400">
          {standing.referrals > 0
            ? `${standing.referrals} ${standing.referrals === 1 ? 'friend' : 'friends'} joined with your link`
            : `of ${standing.total.toLocaleString()} waiting`}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {standing.name ? `You're on the list, ${standing.name.split(' ')[0]}. ` : "You're on the list. "}
        We'll email you when it's your turn. Want in sooner? Every friend who joins with your link moves you up the line.
      </p>
      <ShareButtons url={standing.inviteUrl} title="Join me on the GiftMe waitlist, wishlists your friends can actually give to" />
    </div>
  )
}
