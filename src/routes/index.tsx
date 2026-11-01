import { createFileRoute } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme'
import { Bar, Glow, Logo, glassCard } from '@/components/ui'
import { OCCASIONS } from '@/lib/occasions'
import { primaryButton, secondaryButton } from '@/lib/ui'
import { naira } from '@/lib/format'

export const Route = createFileRoute('/')({
  component: Landing,
})

const START_HREF = '/start'

function Landing() {
  const { viewer } = Route.useRouteContext()
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow tall />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <nav className="flex items-center justify-between pt-6">
          <Logo />
          <div className="flex items-center gap-2.5">
            <a href={START_HREF} className={`inline-flex min-h-10 items-center px-4 text-sm ${secondaryButton}`}>
              {viewer?.user ? 'Your wishlists' : 'Sign in'}
            </a>
            <ThemeToggle />
          </div>
        </nav>

        <Hero />
        <HowItWorks />
        <Occasions />
        <Features />
        <FinalCta />

        <footer className="flex flex-col gap-2 border-t border-neutral-200 py-8 text-xs text-neutral-500 sm:flex-row sm:justify-between dark:border-neutral-800 dark:text-neutral-400">
          <span>Payments by Paystack · every naira tracked in a Blnk ledger</span>
          <span>© {new Date().getFullYear()} GiftMe</span>
        </footer>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <header className="grid items-center gap-12 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <div className="rise flex flex-col gap-6">
        <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">
          Wishlists for every occasion
        </p>
        <h1 className="font-display text-5xl leading-[0.95] font-normal sm:text-7xl">
          Gifts your people will <span className="font-editorial text-6xl sm:text-8xl">actually</span> want to give
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Make a wishlist in minutes. Paste a link from any store and we fill in the rest. Share one link, and friends
          chip in any amount in naira or reserve a gift to buy themselves. The money goes straight to your bank.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={START_HREF} className={`inline-flex min-h-12 items-center px-6 text-[15px] ${primaryButton}`}>
            Start your wishlist, it's free
          </a>
          <a href="#how" className={`inline-flex min-h-12 items-center px-5 text-[15px] ${secondaryButton}`}>
            See how it works
          </a>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Payments by Paystack · every naira tracked in a Blnk ledger
        </p>
      </div>
      <HeroPreview />
    </header>
  )
}

const DEMO = [
  { title: 'Ceramic pour-over set', price: 38000, percent: 72, img: 'from-amber-200/80 to-rose-200/70' },
  { title: 'Honeymoon in Zanzibar', price: 1200000, percent: 41, img: 'from-sky-200/80 to-teal-200/70', fund: true },
  { title: 'Linen bedding, queen', price: 95000, percent: 100, img: 'from-violet-200/80 to-pink-200/70' },
]

function HeroPreview() {
  return (
    <div className="rise relative mx-auto w-full max-w-md [animation-delay:150ms] lg:max-w-none">
      <div className={`relative rounded-3xl p-5 sm:p-6 ${glassCard}`}>
        <div className="flex items-center gap-3">
          <div className="relative size-10 shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-75 blur-sm" />
            <div className="font-display relative grid size-full place-items-center rounded-full bg-neutral-100 text-neutral-600 ring-2 ring-white/70 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-900/70">
              AT
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl leading-tight">Ada & Tobi's wedding</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">12 December · 41 days to go</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {DEMO.map((d) => (
            <div key={d.title} className="flex items-center gap-3.5 rounded-2xl border border-neutral-200/60 bg-white/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
              <div className={`size-14 shrink-0 rounded-xl bg-gradient-to-br ${d.img} dark:opacity-60`} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display truncate text-lg leading-tight">{d.title}</span>
                  <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{naira(d.price)}</span>
                </div>
                {d.percent === 100 ? (
                  <span className="font-editorial text-lg leading-none text-emerald-800 dark:text-emerald-300">Fully gifted, thank you</span>
                ) : (
                  <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Bar percent={d.percent} />
                    <span className="w-8 text-right">{d.percent}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`absolute -bottom-12 -left-4 hidden rounded-2xl px-4 py-3 sm:block ${glassCard}`}>
        <p className="font-editorial text-2xl leading-none">Chioma gave ₦20,000</p>
        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">only the couple sees names</p>
      </div>
    </div>
  )
}

function SectionTitle({ kicker, title, accent }: { kicker: string; title: string; accent?: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">{kicker}</p>
      <h2 className="font-display text-4xl leading-none sm:text-5xl">
        {title} {accent && <span className="font-editorial text-5xl sm:text-6xl">{accent}</span>}
      </h2>
    </div>
  )
}

const STEPS = [
  {
    title: 'Make your list',
    body: 'Pick the occasion, then paste product links or search for gifts. Photos and prices fill in by themselves. Add a cash fund for bigger dreams.',
  },
  {
    title: 'Share one link',
    body: "Send your list's link on WhatsApp or anywhere. Friends see what is left on each gift, never who gave what.",
  },
  {
    title: 'Friends give',
    body: 'They chip in any amount by card, transfer or USSD, or reserve a gift to buy themselves. You get the money in your bank.',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-10 border-t border-neutral-200/80 py-20 dark:border-neutral-800">
      <SectionTitle kicker="How it works" title="Three steps," accent="that's it" />
      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`relative overflow-hidden rounded-2xl p-6 ${glassCard}`}>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/[0.06] via-pink-500/[0.03] to-transparent dark:from-purple-500/10 dark:via-pink-500/5"
            />
            <span className="font-editorial relative text-5xl text-purple-500/80 dark:text-purple-300/80">{i + 1}</span>
            <h3 className="font-display relative mt-2 text-2xl">{s.title}</h3>
            <p className="relative mt-2 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Occasions() {
  return (
    <section className="border-t border-neutral-200/80 py-20 dark:border-neutral-800">
      <SectionTitle kicker="Occasions" title="For whatever you're" accent="celebrating" />
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {OCCASIONS.map((o) => (
          <a
            key={o.id}
            href={START_HREF}
            className={`group flex flex-col gap-1 rounded-2xl p-5 transition-transform hover:-translate-y-0.5 ${glassCard}`}
          >
            <span className="font-display text-2xl leading-tight">{o.label}</span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{o.blurb}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

const FEATURES = [
  { title: 'Paste a link, done', body: 'Drop in a link from Jumia, Konga, Amazon or any shop. We read the title, photo and price the store publishes.' },
  { title: 'Search for gifts', body: 'Type "drum set" and pick from real products with photos and naira prices.' },
  { title: 'Cash funds', body: 'Honeymoon, school fees, a new laptop. Let people give toward a goal with no fixed product.' },
  { title: 'Reserve to buy', body: 'Guests can claim a gift and buy it themselves, so nobody buys the same blender twice.' },
  { title: 'Private by default', body: 'Guests only see progress. You see every name, amount and sweet note on your dashboard.' },
  { title: 'Straight to your bank', body: 'Paystack settles each gift to your own account. GiftMe never holds your money.' },
]

function Features() {
  return (
    <section className="border-t border-neutral-200/80 py-20 dark:border-neutral-800">
      <SectionTitle kicker="Why GiftMe" title="Easy for you," accent="easier for them" />
      <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col gap-2">
            <span className="h-px w-10 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
            <h3 className="font-display text-2xl">{f.title}</h3>
            <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{f.body}</p>
          </div>
        ))}
      </div>
      <div className={`mt-14 flex flex-col gap-2 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between ${glassCard}`}>
        <div>
          <p className="font-display text-2xl">Every naira, accounted for</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Payments run on Paystack. Each gift is recorded in a double-entry Blnk ledger, so totals are always right.
          </p>
        </div>
        <span className="text-xs tracking-[0.14em] whitespace-nowrap text-neutral-500 uppercase dark:text-neutral-400">
          Paystack · Blnk
        </span>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-neutral-200/80 py-24 text-center dark:border-neutral-800">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute top-1/2 left-1/2 h-72 w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-400/20 via-pink-400/15 to-blue-400/15 blur-3xl dark:from-purple-500/10 dark:via-pink-500/10 dark:to-blue-500/10" />
      </div>
      <div className="relative flex flex-col items-center gap-6">
        <h2 className="font-display text-5xl leading-none sm:text-6xl">
          Your next <span className="font-editorial text-6xl sm:text-7xl">celebration</span> starts here
        </h2>
        <p className="max-w-md text-[15px] text-neutral-600 dark:text-neutral-400">
          Sign in with Google or your email. No passwords, no forms to fight with.
        </p>
        <a href={START_HREF} className={`inline-flex min-h-12 items-center px-7 text-[15px] ${primaryButton}`}>
          Create my wishlist
        </a>
      </div>
    </section>
  )
}
