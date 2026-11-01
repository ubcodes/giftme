import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from '@/components/theme'
import { Bar, GiftIcon, Logo, glassCard } from '@/components/ui'
import { OCCASIONS } from '@/lib/occasions'
import { REPO_URL } from '@/lib/site'
import { primaryButton, secondaryButton } from '@/lib/ui'
import { naira } from '@/lib/format'

export const Route = createFileRoute('/')({
  component: Landing,
})

const START_HREF = '/start'

function Landing() {
  const { viewer } = Route.useRouteContext()
  const signedIn = !!viewer?.user
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Aurora />
      <Nav signedIn={signedIn} />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Hero />
      </div>
      <Ticker />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <MagicLink />
        <HowItWorks />
        <Occasions />
        <Features />
        <OpenSource />
        <Faq />
        <FinalCta />
        <footer className="flex flex-col gap-2 border-t border-neutral-200 py-8 text-xs text-neutral-500 sm:flex-row sm:justify-between dark:border-neutral-800 dark:text-neutral-400">
          <span>GiftMe is free and open source.</span>
          <span>© {new Date().getFullYear()} GiftMe · Made for celebrations</span>
        </footer>
      </div>
    </div>
  )
}

// --- Building blocks -------------------------------------------------------------------

/** Slowly drifting purple, pink and blue light behind the page. */
function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] overflow-hidden">
      <div className="drift-a absolute -top-40 left-[8%] h-[480px] w-[560px] rounded-full bg-purple-400/30 blur-3xl dark:bg-purple-600/20" />
      <div className="drift-b absolute -top-24 right-[4%] h-[420px] w-[520px] rounded-full bg-pink-400/25 blur-3xl dark:bg-pink-600/15" />
      <div className="drift-c absolute top-64 left-1/3 h-[380px] w-[620px] rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/15" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.06)_1px,transparent_0)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.06)_1px,transparent_0)]" />
    </div>
  )
}

/** Fades and lifts its children in when they scroll into view. */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${shown ? 'shown' : ''} ${className}`} style={{ '--delay': `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  )
}

function useCycle(length: number, ms: number) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % length), ms)
    return () => clearInterval(t)
  }, [length, ms])
  return i
}

function SectionTitle({ kicker, title, accent }: { kicker: string; title: string; accent?: string }) {
  return (
    <Reveal className="flex max-w-2xl flex-col gap-3">
      <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">{kicker}</p>
      <h2 className="font-display text-4xl leading-none sm:text-5xl">
        {title} {accent && <span className="font-editorial text-5xl sm:text-6xl">{accent}</span>}
      </h2>
    </Reveal>
  )
}

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  )
}

// --- Sections --------------------------------------------------------------------------

function Nav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav
      className={`sticky top-0 z-30 transition-all duration-300 ${
        scrolled ? 'border-b border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/5 dark:bg-neutral-950/60' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2.5">
          <a href="#open-source" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 sm:inline-flex dark:text-neutral-400 dark:hover:text-neutral-100">
            <GitHubIcon size={14} /> Open source
          </a>
          <a href={START_HREF} className={`inline-flex min-h-10 items-center px-4 text-sm ${secondaryButton}`}>
            {signedIn ? 'Your wishlists' : 'Sign in'}
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}

const ROTATING = ['birthday', 'wedding', 'baby shower', 'graduation', 'housewarming', 'anniversary']

function Hero() {
  const i = useCycle(ROTATING.length, 2400)
  return (
    <header className="grid grid-cols-1 items-center gap-14 pt-10 pb-20 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="rise flex min-w-0 flex-col gap-6">
        <a
          href="#open-source"
          className="inline-flex items-center gap-2 self-start rounded-full border border-purple-300/50 bg-white/50 px-3 py-1 text-xs text-purple-800 backdrop-blur dark:border-purple-500/30 dark:bg-neutral-900/40 dark:text-purple-200"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-purple-500" />
          </span>
          Free and open source
        </a>
        <h1 className="font-display text-[36px] leading-[0.95] font-normal sm:text-6xl xl:text-7xl">
          <span className="sm:whitespace-nowrap">The wishlist for your</span>
          <br />
          <span key={i} className="word-in font-editorial inline-block bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text pr-2 text-[52px] text-transparent sm:text-8xl">
            {ROTATING[i]}
          </span>
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Make a wishlist in minutes. Paste a link from any shop or just type what you'd love, and we fill in the rest.
          Share one link, and friends chip in any amount in naira or reserve a gift to buy themselves. The money goes
          straight to your bank.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={START_HREF} className={`glow-ring inline-flex min-h-12 items-center rounded-full bg-neutral-50 dark:bg-neutral-950`}>
            <span className={`inline-flex min-h-12 items-center px-6 text-[15px] ${primaryButton}`}>Start your wishlist, it's free</span>
          </a>
          <a href="#how" className={`inline-flex min-h-12 items-center px-5 text-[15px] ${secondaryButton}`}>
            See how it works
          </a>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span>✓ No fees to start</span>
          <span>✓ Guests don't need an account</span>
          <span>✓ Card, transfer or USSD</span>
        </div>
      </div>
      <HeroPreview />
    </header>
  )
}

const DEMO_ITEMS = [
  { title: 'Ceramic pour-over set', price: 38000, start: 54, img: 'from-amber-200/80 to-rose-200/70' },
  { title: 'Honeymoon in Zanzibar', price: 1200000, start: 31, img: 'from-sky-200/80 to-teal-200/70' },
  { title: 'Linen bedding, queen', price: 95000, start: 88, img: 'from-violet-200/80 to-pink-200/70' },
]

const DEMO_EVENTS = [
  { who: 'Chioma', what: 'gave ₦20,000', item: 0, bump: 18 },
  { who: 'Tunde', what: 'gave ₦150,000', item: 1, bump: 12 },
  { who: 'Ife', what: 'gave ₦12,000', item: 2, bump: 12 },
  { who: 'Kemi', what: 'gave ₦5,000', item: 0, bump: 10 },
]

/** A live-looking wishlist: gifts arrive, bars fill, and the card tilts with the pointer. */
function HeroPreview() {
  const [progress, setProgress] = useState(DEMO_ITEMS.map(() => 0))
  const [event, setEvent] = useState(-1)
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const start = setTimeout(() => setProgress(DEMO_ITEMS.map((d) => d.start)), 300)
    let n = 0
    const tick = setInterval(() => {
      const e = DEMO_EVENTS[n % DEMO_EVENTS.length]
      setEvent(n)
      setProgress((p) => {
        const next = [...p]
        // Loop back down once the demo has filled up, so it keeps moving.
        next[e.item] = next[e.item] >= 100 ? DEMO_ITEMS[e.item].start : Math.min(100, next[e.item] + e.bump)
        return next
      })
      n++
    }, 3200)
    return () => {
      clearTimeout(start)
      clearInterval(tick)
    }
  }, [])

  function tilt(e: React.PointerEvent) {
    const el = card.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`
  }

  const current = event >= 0 ? DEMO_EVENTS[event % DEMO_EVENTS.length] : null

  return (
    <div className="rise relative mx-auto w-full max-w-md [animation-delay:150ms] lg:max-w-none" onPointerMove={tilt} onPointerLeave={() => card.current && (card.current.style.transform = '')}>
      <div ref={card} className={`relative rounded-3xl p-5 transition-transform duration-300 ease-out sm:p-6 ${glassCard}`}>
        <div className="flex items-center gap-3">
          <div className="relative size-11 shrink-0">
            <div className="absolute inset-0 animate-[spin-slow_8s_linear_infinite] rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-80 blur-sm" />
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
          {DEMO_ITEMS.map((d, i) => (
            <div
              key={d.title}
              className={`flex items-center gap-3.5 rounded-2xl border bg-white/50 p-3 transition-colors duration-500 dark:bg-neutral-900/40 ${
                current?.item === i ? 'border-purple-300/80 dark:border-purple-500/40' : 'border-neutral-200/60 dark:border-neutral-800'
              }`}
            >
              <div className={`grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-neutral-500/60 ${d.img} dark:opacity-60`}>
                <GiftIcon size={20} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display truncate text-lg leading-tight">{d.title}</span>
                  <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{naira(d.price)}</span>
                </div>
                {progress[i] >= 100 ? (
                  <span className="font-editorial text-lg leading-none text-emerald-800 dark:text-emerald-300">Fully gifted, thank you</span>
                ) : (
                  <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Bar percent={progress[i]} />
                    <span className="w-8 text-right tabular-nums">{progress[i]}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {current && (
        <div key={event} className={`toast absolute -bottom-10 -left-3 rounded-2xl px-4 py-3 sm:-left-8 ${glassCard} bg-white/80 dark:bg-neutral-900/80`}>
          <p className="font-editorial text-2xl leading-none">
            {current.who} {current.what}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">only the couple sees names</p>
        </div>
      )}
      <div className={`float absolute -top-5 -right-2 hidden rounded-full px-3 py-1.5 text-xs sm:block ${glassCard} bg-white/80 dark:bg-neutral-900/80`}>
        🎁 3 gifts reserved
      </div>
    </div>
  )
}

const TICKER = ['Air fryer', 'Honeymoon fund', 'Drum set', 'Baby stroller', 'New laptop', 'School fees', 'Standing mixer', 'Weekend in Obudu', 'Bookshelf', 'Wedding rings', 'Camera', 'Gym membership']

function Ticker() {
  return (
    <div className="marquee-wrap relative border-y border-neutral-200/70 bg-white/30 py-4 backdrop-blur-sm dark:border-neutral-800/70 dark:bg-neutral-900/20">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-neutral-50 dark:from-[#0a0a0a]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-neutral-50 dark:from-[#0a0a0a]" />
      <div className="marquee flex w-max gap-10 whitespace-nowrap">
        {[...TICKER, ...TICKER].map((t, i) => (
          <span key={i} className="font-display flex items-center gap-10 text-2xl text-neutral-500 dark:text-neutral-400">
            {t}
            <span className="font-editorial text-purple-400">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const DEMO_URL = 'jumia.com.ng/5-drum-junior-jazz-kit.html'

/** Types a shop link, then shows the card GiftMe fills in from it. */
function MagicLink() {
  const [typed, setTyped] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'reading' | 'done'>('typing')
  const box = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let t: ReturnType<typeof setTimeout>
    if (phase === 'typing') {
      t = typed < DEMO_URL.length ? setTimeout(() => setTyped((n) => n + 1), 45) : setTimeout(() => setPhase('reading'), 400)
    } else if (phase === 'reading') {
      t = setTimeout(() => setPhase('done'), 1100)
    } else {
      t = setTimeout(() => {
        setTyped(0)
        setPhase('typing')
      }, 4200)
    }
    return () => clearTimeout(t)
  }, [visible, phase, typed])

  return (
    <section className="grid grid-cols-1 items-center gap-12 py-24 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <SectionTitle kicker="The magic part" title="Paste a link." accent="That's the whole form." />
        <Reveal delay={100}>
          <p className="max-w-md text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            Found it on Jumia, Amazon, Temu or a small shop's website? Paste the link and GiftMe fills in the name, photo
            and price. Or just type “drum set” and pick from shops that sell it, in Nigeria and abroad.
          </p>
        </Reveal>
      </div>
      <Reveal delay={150}>
        <div ref={box} className={`rounded-3xl p-5 sm:p-6 ${glassCard}`}>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-300/70 bg-white/70 px-3.5 py-3 text-sm dark:border-neutral-700/70 dark:bg-neutral-900/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-neutral-400" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
            <span className="truncate text-neutral-700 dark:text-neutral-300">
              {DEMO_URL.slice(0, typed)}
              {phase === 'typing' && <span className="caret ml-px inline-block h-4 w-px translate-y-0.5 bg-purple-500" />}
            </span>
          </div>
          <div className="mt-4 min-h-[124px]">
            {phase === 'reading' && (
              <div className="flex animate-pulse items-center gap-4 rounded-2xl border border-neutral-200/70 p-3 dark:border-neutral-800">
                <div className="size-24 rounded-xl bg-neutral-200/80 dark:bg-neutral-800" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3.5 w-4/5 rounded bg-neutral-200/80 dark:bg-neutral-800" />
                  <div className="h-3.5 w-1/3 rounded bg-neutral-200/80 dark:bg-neutral-800" />
                </div>
              </div>
            )}
            {phase === 'done' && (
              <div className="rise flex items-center gap-4 rounded-2xl border border-purple-300/60 bg-white/60 p-3 dark:border-purple-500/30 dark:bg-neutral-900/50">
                <div className="grid size-24 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-200 to-indigo-200 text-3xl dark:from-sky-500/20 dark:to-indigo-500/20">🥁</div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-xl leading-tight">5-Drum Junior Jazz Drum Kit</span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{naira(37360)} · from Jumia</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">✓ Name, photo and price filled in</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
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
    <section id="how" className="scroll-mt-20 border-t border-neutral-200/80 py-24 dark:border-neutral-800">
      <SectionTitle kicker="How it works" title="Three steps," accent="that's it" />
      <ol className="relative mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div aria-hidden="true" className="absolute top-12 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-purple-400/0 via-pink-400/60 to-blue-400/0 md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 120}>
            <li className={`relative h-full overflow-hidden rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 ${glassCard}`}>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/[0.06] via-pink-500/[0.03] to-transparent dark:from-purple-500/10 dark:via-pink-500/5" />
              <span className="font-editorial relative grid size-14 place-items-center rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/15 text-4xl text-purple-600 dark:text-purple-300">
                {i + 1}
              </span>
              <h3 className="font-display relative mt-4 text-2xl">{s.title}</h3>
              <p className="relative mt-2 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

const OCCASION_TINTS = [
  'from-pink-400/30 to-purple-400/20',
  'from-rose-300/30 to-amber-200/30',
  'from-sky-300/30 to-teal-200/30',
  'from-indigo-300/30 to-purple-300/20',
  'from-emerald-300/30 to-lime-200/30',
  'from-fuchsia-300/30 to-rose-200/30',
  'from-blue-300/30 to-pink-200/30',
]

function Occasions() {
  return (
    <section className="border-t border-neutral-200/80 py-24 dark:border-neutral-800">
      <SectionTitle kicker="Occasions" title="For whatever you're" accent="celebrating" />
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {OCCASIONS.map((o, i) => (
          <Reveal key={o.id} delay={i * 60}>
            <a href={START_HREF} className={`group relative flex h-full flex-col gap-1 overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${glassCard}`}>
              <div aria-hidden="true" className={`absolute -right-10 -bottom-10 size-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 ${OCCASION_TINTS[i % OCCASION_TINTS.length]}`} />
              <span className="font-display relative text-2xl leading-tight">{o.label}</span>
              <span className="relative text-sm text-neutral-500 dark:text-neutral-400">{o.blurb}</span>
              <span className="relative mt-3 text-sm text-purple-700 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 dark:text-purple-300">
                Start one →
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="border-t border-neutral-200/80 py-24 dark:border-neutral-800">
      <SectionTitle kicker="Why GiftMe" title="Easy for you," accent="easier for them" />
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-4">
          <Feature title="Search as you type" body="Type what you want and see real products with photos and prices from shops in Nigeria and abroad. Tap one and it's on your list." big>
            <div className="mt-5 flex gap-2.5 overflow-hidden">
              {['🥁 Drum set', '🍳 Air fryer', '💻 Laptop', '📷 Camera'].map((t, i) => (
                <span key={t} className="float rounded-full border border-neutral-200/80 bg-white/70 px-3 py-1.5 text-sm whitespace-nowrap dark:border-neutral-700 dark:bg-neutral-900/60" style={{ animationDelay: `${i * 0.6}s` }}>
                  {t}
                </span>
              ))}
            </div>
          </Feature>
        </Reveal>
        <Reveal className="md:col-span-2" delay={80}>
          <Feature title="Cash funds" body="Honeymoon, school fees, a new laptop. People give toward a goal with no fixed product." />
        </Reveal>
        <Reveal className="md:col-span-2" delay={120}>
          <Feature title="Reserve to buy" body="Guests can claim a gift and buy it themselves, so nobody buys the same blender twice." />
        </Reveal>
        <Reveal className="md:col-span-2" delay={160}>
          <Feature title="Private by default" body="Guests only see progress. You see every name, amount and sweet note." />
        </Reveal>
        <Reveal className="md:col-span-2" delay={200}>
          <Feature title="Straight to your bank" body="Each gift settles to your own account. GiftMe never holds your money." />
        </Reveal>
        <Reveal className="md:col-span-3" delay={80}>
          <Feature title="Share anywhere" body="One link for WhatsApp, Instagram or the wedding programme. A countdown shows how many days are left." />
        </Reveal>
        <Reveal className="md:col-span-3" delay={120}>
          <Feature title="Say thank you" body="See who gave and send each person a thank-you note right from your dashboard." />
        </Reveal>
      </div>
    </section>
  )
}

function Feature({ title, body, big, children }: { title: string; body: string; big?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`group relative h-full overflow-hidden rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 ${glassCard}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
      <span className="relative block h-px w-10 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
      <h3 className={`font-display relative mt-3 ${big ? 'text-3xl' : 'text-2xl'}`}>{title}</h3>
      <p className="relative mt-2 max-w-md text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
      {children}
    </div>
  )
}

function OpenSource() {
  return (
    <section id="open-source" className="scroll-mt-20 border-t border-neutral-200/80 py-24 dark:border-neutral-800">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200/70 bg-neutral-900 p-8 text-neutral-100 sm:p-12 dark:border-neutral-800">
          <div aria-hidden="true" className="drift-a absolute -top-24 -right-24 size-80 rounded-full bg-purple-500/30 blur-3xl" />
          <div aria-hidden="true" className="drift-b absolute -bottom-24 -left-16 size-72 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col gap-4">
              <p className="flex items-center gap-2 text-xs tracking-[0.14em] text-neutral-400 uppercase">
                <GitHubIcon size={14} /> Open source
              </p>
              <h2 className="font-display text-4xl leading-none sm:text-5xl">
                Built in the <span className="font-editorial text-5xl text-pink-300 sm:text-6xl">open</span>
              </h2>
              <p className="max-w-md text-[15px] leading-relaxed text-neutral-300">
                Every line of GiftMe is public. Read how your money moves, suggest a feature, or run your own copy for your
                community. Contributions are welcome.
              </p>
              {REPO_URL && (
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-white px-5 text-[15px] text-neutral-900 transition-transform hover:-translate-y-0.5">
                  <GitHubIcon /> View the code
                </a>
              )}
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-[13px] leading-relaxed text-neutral-300">
              <code>
                <span className="text-neutral-500">$</span> git clone giftme{'\n'}
                <span className="text-neutral-500">$</span> npm install{'\n'}
                <span className="text-neutral-500">$</span> npm run dev{'\n'}
                <span className="text-emerald-400">✓</span> Ready on <span className="text-pink-300">localhost:3200</span>
              </code>
            </pre>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const FAQ = [
  { q: 'Is GiftMe free?', a: "Yes. Making a wishlist and sharing it is free. When a friend gives, a small card processing fee comes out of that gift; GiftMe doesn't add anything on top." },
  { q: 'Where does the money go?', a: 'Straight to the bank account you add in your settings. GiftMe never holds your money.' },
  { q: 'Do my guests need an account?', a: 'No. They open your link, pick a gift and pay by card, bank transfer or USSD. That is all.' },
  { q: 'Can people see how much others gave?', a: 'No. Guests only see how close each gift is to being complete. Only you see names, amounts and notes.' },
  { q: 'What if someone wants to buy the gift themselves?', a: "They tap “Reserve to buy”. Everyone else sees it's taken, so nobody doubles up." },
  { q: 'Is it really open source?', a: 'Yes. All the code is public, and anyone can read it, suggest changes or run their own copy.' },
]

function Faq() {
  return (
    <section className="border-t border-neutral-200/80 py-24 dark:border-neutral-800">
      <SectionTitle kicker="Questions" title="Good to" accent="know" />
      <div className="mt-10 flex max-w-3xl flex-col gap-3">
        {FAQ.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details className={`group rounded-2xl px-5 py-4 ${glassCard}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] [&::-webkit-details-marker]:hidden">
                <span className="font-display text-xl">{f.q}</span>
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-neutral-300/70 text-neutral-500 transition-transform duration-300 group-open:rotate-45 dark:border-neutral-700">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-neutral-200/80 py-28 text-center dark:border-neutral-800">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="drift-c absolute top-1/2 left-1/2 h-72 w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-400/25 via-pink-400/20 to-blue-400/20 blur-3xl dark:from-purple-500/15 dark:via-pink-500/10 dark:to-blue-500/10" />
      </div>
      <Reveal className="relative flex flex-col items-center gap-6">
        <h2 className="font-display text-5xl leading-none sm:text-6xl">
          Your next <span className="font-editorial text-6xl sm:text-7xl">celebration</span> starts here
        </h2>
        <p className="max-w-md text-[15px] text-neutral-600 dark:text-neutral-400">Sign in with Google or your email. No passwords, no forms to fight with.</p>
        <a href={START_HREF} className="glow-ring inline-flex min-h-12 items-center rounded-full bg-neutral-50 dark:bg-neutral-950">
          <span className={`inline-flex min-h-12 items-center px-7 text-[15px] ${primaryButton}`}>Create my wishlist</span>
        </a>
      </Reveal>
    </section>
  )
}
