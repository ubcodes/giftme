import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { FollowCursor } from '@/components/liquid'
import { Stage, type SceneName } from '@/components/feature-stages'
import { Film } from '@/components/film'
import { ThemeToggle } from '@/components/theme'
import { useMagnetic, useScrollVar, useSmoothScroll } from '@/lib/scroll'
import { Bar, Logo, glassCard } from '@/components/ui'
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
  useSmoothScroll()
  useMagnetic()
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Aurora />
      <FollowCursor />
      <Nav signedIn={signedIn} />
      <Hero />
      <Ticker />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <TryIt />
        <section id="film" className="scroll-mt-20 flex flex-col gap-8 pt-20 sm:pt-24">
          <SectionTitle kicker="See it in action" title="GiftMe in" accent="40 seconds" />
          <Film />
        </section>
        <FeatureSections />
        <Occasions />
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
        scrolled ? 'border-b border-white/40 bg-white/40 shadow-[inset_0_-1px_0_rgb(255_255_255/0.5)] backdrop-blur-2xl backdrop-saturate-200 dark:border-white/5 dark:bg-neutral-950/40' : 'border-b border-transparent'
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

const GiftScene = lazy(() => import('@/components/gift-scene'))

/**
 * A full-screen hero pinned while you scroll through it: a 3D gift drops in, and as you
 * scroll its lid lifts and gifts from a real wishlist rise out and circle it. Scroll
 * progress lives in a CSS variable and a ref, so scrolling never re-renders React.
 */
function Hero() {
  const i = useCycle(ROTATING.length, 2400)
  const section = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const [scene, setScene] = useState<{ still: boolean; compact: boolean } | null>(null)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const probe = document.createElement('canvas')
    const webgl = !!(probe.getContext('webgl2') || probe.getContext('webgl'))
    if (webgl) setScene({ still, compact: window.innerWidth < 768 })
    if (still) progress.current = 0.8
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting))
    io.observe(el)
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const p = still ? 0.8 : Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)))
        progress.current = p
        el.style.setProperty('--p', p.toFixed(4))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <section ref={section} className="relative -mt-[72px] h-[100svh] motion-safe:h-[240vh]" style={{ '--p': 0 } as React.CSSProperties}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0">
          {scene && (
            <Suspense fallback={null}>
              <GiftScene progress={progress} still={scene.still} active={active} compact={scene.compact} />
            </Suspense>
          )}
        </div>

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-between px-5 pt-24 pb-8 sm:px-8 sm:pt-28 lg:pb-12">
          <div className="flex flex-col gap-6" style={{ opacity: 'calc(1 - var(--p) * 2.6)', transform: 'translateY(calc(var(--p) * -120px))' }}>
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
            <h1 className="font-display text-[clamp(48px,9vw,148px)] leading-[0.86] font-normal tracking-[-0.02em]">
              <span className="block">The wishlist</span>
              <span className="block">for your</span>
              <span
                key={i}
                className="word-in font-editorial inline-block bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text pr-3 text-[1.25em] leading-[0.9] text-transparent"
              >
                {ROTATING[i]}
              </span>
            </h1>
          </div>

          <div className="flex flex-col gap-5 lg:max-w-md" style={{ opacity: 'calc(1 - var(--p) * 3)' }}>
            <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              Paste a link from any shop or just say what you'd love. Share one link, and friends chip in any amount in naira or reserve a
              gift to buy themselves. The money goes straight to your bank.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a href={START_HREF} data-magnetic data-cursor="Let's go ✨" className={`inline-flex min-h-12 items-center px-6 text-[15px] ${primaryButton}`}>
                Start your wishlist, it's free
              </a>
              <a href="#how" className={`inline-flex min-h-12 items-center px-5 text-[15px] ${secondaryButton}`}>
                See how it works
              </a>
            </div>
          </div>

          {/* What the open gift means, once you've scrolled. */}
          <p
            className="font-display pointer-events-none absolute bottom-10 left-5 max-w-xl text-[clamp(36px,5.5vw,84px)] leading-[0.95] sm:left-8 lg:bottom-16"
            style={{ opacity: 'calc((var(--p) - 0.32) * 3)', transform: 'translateY(calc((1 - var(--p)) * 60px))' }}
          >
            Everything you'd love, <span className="font-editorial text-[1.2em] text-purple-600 dark:text-purple-300">one link</span> away.
          </p>
          <p
            aria-hidden="true"
            className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-xs tracking-[0.2em] text-neutral-500 uppercase lg:motion-safe:block"
            style={{ opacity: 'calc(1 - var(--p) * 8)' }}
          >
            Scroll to open ↓
          </p>
        </div>
      </div>
    </section>
  )
}

/** The live wishlist from the old hero: tap Give, or watch a friend do it. */
function TryIt() {
  return (
    <section className="grid grid-cols-1 items-center gap-12 border-t border-neutral-200/80 py-24 lg:grid-cols-[1fr_1.1fr] dark:border-neutral-800">
      <Reveal className="flex flex-col gap-4">
        <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Go on</p>
        <h2 className="font-display text-[clamp(44px,6vw,84px)] leading-[0.9]">
          Try giving <span className="font-editorial text-[1.2em]">something</span>
        </h2>
        <p className="max-w-md text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          This is what your friends see. Tap Give on any gift and watch the bar fill. When nobody is tapping, Chioma and the others chip in.
        </p>
      </Reveal>
      <HeroPreview />
    </section>
  )
}

const DEMO_ITEMS = [
  { title: 'Ceramic pour-over set', price: 38000, start: 54, img: '/images/demo/pour-over.jpg', tint: 'from-amber-200/80 to-rose-200/70' },
  { title: 'Honeymoon in Zanzibar', price: 1200000, start: 31, img: '/images/demo/beach.jpg', tint: 'from-sky-200/80 to-teal-200/70' },
  { title: 'Stand mixer', price: 285000, start: 78, img: '/images/demo/mixer.jpg', tint: 'from-violet-200/80 to-pink-200/70' },
]

const GHOSTS = ['Chioma', 'Tunde', 'Ife', 'Kemi', 'Bayo']
const GIFT_STEPS = [5000, 10000, 20000]

type Toast = { id: number; text: string; you: boolean }

/**
 * A live, clickable wishlist. Visitors can tap "Give" on any gift; when they're not
 * playing with it, a friend's cursor drifts over and gives on its own. Gifts that reach
 * 100% burst into confetti and then reset so the demo keeps going.
 */
function HeroPreview() {
  const [progress, setProgress] = useState(DEMO_ITEMS.map(() => 0))
  const [toast, setToast] = useState<Toast | null>(null)
  const [bumped, setBumped] = useState<number | null>(null)
  const [burst, setBurst] = useState<{ id: number; item: number } | null>(null)
  const [ghost, setGhost] = useState({ x: 260, y: 40, name: GHOSTS[0], clicking: 0 })
  const card = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const hovering = useRef(false)
  const counter = useRef(0)

  function give(i: number, who: string, you: boolean) {
    const amount = GIFT_STEPS[counter.current % GIFT_STEPS.length]
    counter.current++
    setBumped(i)
    setTimeout(() => setBumped(null), 450)
    setToast({ id: counter.current, text: `${you ? 'You' : who} gave ${naira(amount)}`, you })
    setProgress((p) => {
      const next = [...p]
      next[i] = Math.min(100, next[i] + (you ? 14 : 9))
      if (next[i] >= 100 && p[i] < 100) {
        setBurst({ id: counter.current, item: i })
        setTimeout(() => setProgress((q) => q.map((v, k) => (k === i ? DEMO_ITEMS[i].start : v))), 3800)
      }
      return next
    })
  }

  useEffect(() => {
    const start = setTimeout(() => setProgress(DEMO_ITEMS.map((d) => d.start)), 300)
    let n = 0
    let timer: ReturnType<typeof setTimeout>
    // The friend's cursor: glide to a gift's button, click, wait, repeat.
    const step = () => {
      const i = n % DEMO_ITEMS.length
      const name = GHOSTS[n % GHOSTS.length]
      const btn = buttons.current[i]
      const box = card.current
      if (btn && box && !hovering.current) {
        const b = btn.getBoundingClientRect()
        const c = box.getBoundingClientRect()
        setGhost((g) => ({ ...g, name, x: b.left - c.left + b.width / 2, y: b.top - c.top + b.height / 2 }))
        timer = setTimeout(() => {
          if (!hovering.current) {
            setGhost((g) => ({ ...g, clicking: g.clicking + 1 }))
            give(i, name, false)
          }
          n++
          timer = setTimeout(step, 2200)
        }, 1200)
      } else {
        timer = setTimeout(step, 1500)
      }
    }
    timer = setTimeout(step, 1600)
    return () => {
      clearTimeout(start)
      clearTimeout(timer)
    }
  }, [])

  function tilt(e: React.PointerEvent) {
    const el = card.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`
  }

  return (
    <div
      className="rise relative mx-auto w-full max-w-md [animation-delay:150ms] lg:max-w-none"
      onPointerEnter={() => (hovering.current = true)}
      onPointerMove={tilt}
      onPointerLeave={() => {
        hovering.current = false
        if (card.current) card.current.style.transform = ''
      }}
    >
      <div ref={card} className="liquid relative rounded-3xl p-5 transition-transform duration-300 ease-out sm:p-6">
        <div className="flex items-center gap-3">
          <div className="relative size-11 shrink-0">
            <div className="absolute inset-0 animate-[spin-slow_8s_linear_infinite] rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-80 blur-sm" />
            <img src="/images/demo/couple.jpg" alt="" className="relative size-full rounded-full object-cover ring-2 ring-white/70 dark:ring-neutral-900/70" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl leading-tight">Ada & Tobi's wedding</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">12 December · 41 days to go</p>
          </div>
          <span className="ml-auto hidden rounded-full bg-white/50 px-2.5 py-1 text-[11px] text-neutral-600 sm:inline dark:bg-white/10 dark:text-neutral-300">
            Try it: tap Give
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {DEMO_ITEMS.map((d, i) => (
            <div
              key={d.title}
              className={`relative flex items-center gap-3.5 rounded-2xl border bg-white/55 p-3 transition-colors duration-500 dark:bg-neutral-900/45 ${
                bumped === i ? 'bump border-purple-300/80 dark:border-purple-500/40' : 'border-white/60 dark:border-white/5'
              }`}
            >
              <div className={`size-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${d.tint}`}>
                <img src={d.img} alt="" className="size-full object-cover" />
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
              <button
                ref={(el) => {
                  buttons.current[i] = el
                }}
                type="button"
                data-cursor="Give 🎁"
                disabled={progress[i] >= 100}
                onClick={() => give(i, 'You', true)}
                className={`shrink-0 px-3 py-1.5 text-xs ${primaryButton}`}
              >
                Give
              </button>
              {burst?.item === i && <Confetti key={burst.id} />}
            </div>
          ))}
        </div>

        {/* The friend's cursor */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-20 transition-transform duration-[1100ms] ease-[cubic-bezier(0.45,0,0.2,1)]"
          style={{ transform: `translate(${ghost.x}px, ${ghost.y}px)` }}
        >
          <span key={ghost.clicking} className={ghost.clicking ? 'click-pulse absolute -top-3 -left-3 size-6 rounded-full bg-pink-400/50' : ''} />
          <svg width="20" height="20" viewBox="0 0 24 24" className="drop-shadow-md">
            <path d="M4 3l7 17 2.5-7.5L21 10z" fill="#ec4899" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span className="absolute top-4 left-4 rounded-full rounded-tl-sm bg-pink-500 px-2 py-0.5 text-[11px] whitespace-nowrap text-white shadow">
            {ghost.name}
          </span>
        </div>
      </div>

      {toast && (
        <div key={toast.id} className="toast liquid absolute -bottom-10 -left-3 rounded-2xl px-4 py-3 sm:-left-8">
          <p className="font-editorial text-2xl leading-none">{toast.text}</p>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{toast.you ? 'just like that, no account needed' : 'only the couple sees names'}</p>
        </div>
      )}
      <div className="float liquid absolute -top-5 -right-2 hidden rounded-full px-3 py-1.5 text-xs sm:block">🎁 3 gifts reserved</div>
    </div>
  )
}

function Confetti() {
  const colors = ['#a855f7', '#ec4899', '#3b82f6', '#f59e0b', '#10b981']
  const bits = Array.from({ length: 26 }, (_, i) => {
    const angle = (i / 26) * Math.PI * 2
    const dist = 60 + ((i * 37) % 70)
    return {
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 30}px`,
      r: `${(i * 67) % 360}deg`,
      color: colors[i % colors.length],
      round: i % 3 === 0,
    }
  })
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-1/2 right-10 z-10">
      {bits.map((b, i) => (
        <span
          key={i}
          className={`confetti-bit absolute block ${b.round ? 'size-1.5 rounded-full' : 'h-2.5 w-1 rounded-sm'}`}
          style={{ background: b.color, '--dx': b.dx, '--dy': b.dy, '--r': b.r } as React.CSSProperties}
        />
      ))}
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

type FeatureSpec = {
  id: string
  scene: SceneName
  /** What this step of the journey is, in a couple of words. */
  kicker: string
  title: string
  accent: string
  body: React.ReactNode
}

const FEATURES: FeatureSpec[] = [
  {
    id: 'how',
    scene: 'add',
    kicker: 'Add gifts',
    title: 'Paste a link.',
    accent: 'That’s the whole form.',
    body: (
      <>
        Found it on Jumia, Amazon, Temu or a small shop’s site? Paste the link and GiftMe fills in the <b>name, photo and price</b>. Drag
        gifts into the order you like and star the ones you want most.
      </>
    ),
  },
  {
    id: 'search',
    scene: 'search',
    kicker: 'Search every shop',
    title: 'Don’t have a link?',
    accent: 'Just say what you’d love.',
    body: (
      <>
        Type “polaroid camera” and GiftMe searches shops <b>in Nigeria and abroad</b> at once. Results come back with photos and naira
        prices. Tap one and it’s on your list.
      </>
    ),
  },
  {
    id: 'share',
    scene: 'share',
    kicker: 'Share',
    title: 'Share',
    accent: 'one link.',
    body: (
      <>
        Drop it in the family group, your bio or the wedding programme. It opens as a <b>rich preview with your photo</b>, and guests don’t
        need an account.
      </>
    ),
  },
  {
    id: 'give',
    scene: 'give',
    kicker: 'Give',
    title: 'Friends chip in,',
    accent: 'or reserve it.',
    body: (
      <>
        Guests give <b>any amount</b> by card, transfer or USSD, or reserve a gift to buy themselves so nobody buys the same blender twice.
      </>
    ),
  },
  {
    id: 'thanks',
    scene: 'thanks',
    kicker: 'Get paid, say thanks',
    title: 'Money lands.',
    accent: 'Say thanks.',
    body: (
      <>
        Every gift settles <b>straight to your bank</b>. You see each name, amount and sweet note, and send a thank-you in one tap.
      </>
    ),
  },
  {
    id: 'friends',
    scene: 'friends',
    kicker: 'Friends',
    title: 'Find your',
    accent: 'people.',
    body: (
      <>
        See which of your contacts are already on GiftMe, follow them, and see <b>whose birthday, wedding or big day is next</b>. Search by
        their Instagram, TikTok, X or Substack handle too.
      </>
    ),
  },
]

/** One feature per section: a headline, a live demo of just that feature, and three details. */
function FeatureSections() {
  return (
    <div className="flex flex-col">
      {FEATURES.map((f, i) => (
        <FeatureSection key={f.id} feature={f} index={i} />
      ))}
    </div>
  )
}

/** A word-by-word reveal driven by the section's scroll progress (--s), each word rising out of its own mask. */
function ScrollWords({ text, className = '', offset = 0 }: { text: string; className?: string; offset?: number }) {
  return (
    <span className={className}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pr-[0.22em] pb-[0.08em] align-bottom">
          <span
            className="inline-block"
            style={{ transform: `translateY(calc((1 - clamp(0, calc(var(--s) * 3.2 - ${(i + offset) * 0.18}), 1)) * 105%))` }}
          >
            {word}
          </span>
        </span>
      ))}
    </span>
  )
}

/**
 * One step of the GiftMe journey (the big number is its place in that order): a headline that
 * rises word by word and the demo screen tilting up from flat in 3D as it scrolls into view.
 * The "give" step is dark, for contrast.
 */
function FeatureSection({ feature: f, index }: { feature: FeatureSpec; index: number }) {
  const ref = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  useScrollVar(ref, { start: 0.95, end: 0.45 })
  useScrollVar(stage, { start: 1, end: 0.3 })
  const dark = f.id === 'give'
  const titleWords = f.title.split(' ').length
  return (
    <section
      ref={ref}
      id={f.id}
      className={`relative isolate scroll-mt-20 flex flex-col gap-10 py-24 sm:py-32 ${dark ? 'dark text-neutral-100' : ''}`}
      style={{ '--s': 0 } as React.CSSProperties}
    >
      {dark && (
        <div aria-hidden="true" className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden bg-[#0c0814]">
          <div className="absolute -top-40 left-[10%] h-[420px] w-[620px] rounded-full bg-purple-600/25 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-[380px] w-[520px] rounded-full bg-pink-600/15 blur-3xl" />
        </div>
      )}
      <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[auto_1fr] lg:gap-12">
        <span
          aria-hidden="true"
          className="font-display text-[clamp(88px,14vw,220px)] leading-[0.75] text-transparent [-webkit-text-stroke:1.5px_rgb(168_85_247/0.55)]"
          style={{ opacity: 'calc(0.25 + var(--s) * 0.75)', transform: 'translateX(calc((1 - var(--s)) * -40px))' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="text-xs tracking-[0.18em] text-neutral-500 uppercase dark:text-neutral-400">{f.kicker}</p>
          <h2 className="font-display text-[clamp(40px,5.6vw,84px)] leading-[0.95] tracking-[-0.01em]">
            <ScrollWords text={f.title} />{' '}
            <ScrollWords text={f.accent} offset={titleWords} className="font-editorial text-[1.18em] text-purple-600 dark:text-purple-300" />
          </h2>
          <p
            className="max-w-2xl text-[15px] leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-400 [&_b]:font-medium [&_b]:text-neutral-900 dark:[&_b]:text-neutral-100"
            style={{ opacity: 'clamp(0, calc(var(--s) * 2 - 0.4), 1)' }}
          >
            {f.body}
          </p>
        </div>
      </div>
      <div ref={stage} className="[perspective:1600px]" style={{ '--s': 0 } as React.CSSProperties}>
        <div
          className="origin-bottom"
          style={{
            transform: 'rotateX(calc((1 - var(--s)) * 26deg)) scale(calc(0.86 + var(--s) * 0.14)) translateY(calc((1 - var(--s)) * 40px))',
            opacity: 'calc(0.35 + var(--s) * 0.65)',
          }}
        >
          <Stage scene={f.scene} />
        </div>
      </div>
    </section>
  )
}

/**
 * A short muted loop behind each occasion card (free Pexels clips, trimmed in public/video/occasions).
 * It only loads and plays while the card is on screen; with reduced motion the still frame stays.
 */
function OccasionVideo({ id }: { id: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause()), { threshold: 0.25 })
    io.observe(video)
    return () => io.disconnect()
  }, [])
  return (
    <video
      ref={ref}
      aria-hidden="true"
      src={`/video/occasions/${id}.mp4`}
      poster={`/video/occasions/${id}.jpg`}
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
  )
}

/**
 * Occasions as a strip of 3D cards. On big screens the section pins and scrolling down slides
 * the strip sideways; on phones it's a swipeable row.
 */
function Occasions() {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  useScrollVar(section, { start: 0, end: -1.4 })
  useEffect(() => {
    const measure = () => {
      const el = track.current
      if (el && section.current) section.current.style.setProperty('--dist', String(Math.max(0, el.scrollWidth - el.clientWidth + 48)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return (
    <section ref={section} className="relative border-t border-neutral-200/80 lg:h-[240vh] dark:border-neutral-800" style={{ '--s': 0, '--dist': 0 } as React.CSSProperties}>
      <div className="flex flex-col justify-center gap-12 py-24 lg:sticky lg:top-0 lg:h-screen lg:py-0">
        <SectionTitle kicker="Occasions" title="For whatever you're" accent="celebrating" />
        <div
          ref={track}
          className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [perspective:1400px] [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:overflow-visible lg:[transform:translateX(calc(var(--s)*var(--dist)*-1px))]"
        >
          {OCCASIONS.map((o, i) => (
            <a
              key={o.id}
              href={START_HREF}
              data-cursor={`Start a ${o.label.toLowerCase()} list`}
              className="group relative flex h-[380px] w-[280px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[28px] border border-white/70 bg-neutral-900 p-6 text-white shadow-[0_30px_60px_-30px_rgb(88_28_135/0.45)] transition-transform duration-500 [transform:rotateY(-10deg)_translateZ(0)] [transform-style:preserve-3d] hover:[transform:rotateY(0deg)_translateZ(40px)] sm:w-[320px] dark:border-white/10"
            >
              <OccasionVideo id={o.id} />
              {/* Keeps the words readable over any frame, with a hint of brand purple. */}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e]/90 via-[#1a0b2e]/25 to-[#1a0b2e]/10" />
              <span aria-hidden="true" className="font-display relative text-[96px] leading-none text-transparent [-webkit-text-stroke:1.2px_rgb(255_255_255/0.75)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="relative flex flex-col gap-2">
                <span className="font-display text-4xl leading-none">{o.label}</span>
                <span className="text-sm text-white/80">{o.blurb}</span>
                <span className="mt-2 text-sm text-pink-200 transition-transform duration-300 group-hover:translate-x-1">Start one →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function OpenSource() {
  return (
    <section id="open-source" className="scroll-mt-20 border-t border-neutral-200/80 py-24 dark:border-neutral-800">
      <Reveal>
        <div className="relative overflow-clip rounded-3xl border border-neutral-200/70 bg-neutral-900 p-8 text-neutral-100 sm:p-12 dark:border-neutral-800">
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
            <CodeSnippet />
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const CLONE = REPO_URL ? `git clone ${REPO_URL}.git` : 'git clone giftme'
const SETUP_COMMANDS = [CLONE, 'cd giftme', 'npm install', 'npm run dev']

function CodeSnippet() {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(SETUP_COMMANDS.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the commands stay selectable.
    }
  }
  return (
    <div className="relative min-w-0 rounded-2xl border border-white/10 bg-black/40">
      <button
        type="button"
        onClick={copy}
        data-cursor={copied ? 'Copied' : 'Copy'}
        aria-label={copied ? 'Copied' : 'Copy commands'}
        className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        {copied ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2.5" />
            <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
          </svg>
        )}
      </button>
      <pre className="overflow-x-auto p-5 pr-14 text-[13px] leading-relaxed text-neutral-300">
        <code>
          {SETUP_COMMANDS.map((c) => (
            <span key={c}>
              <span className="text-neutral-500">$</span> {c}
              {'\n'}
            </span>
          ))}
          <span className="text-emerald-400">✓</span> Ready on <span className="text-pink-300">localhost:3200</span>
        </code>
      </pre>
    </div>
  )
}

const FAQ = [
  { q: 'Is GiftMe free?', a: "Yes. Making a wishlist and sharing it is free. When a friend gives, a small card processing fee comes out of that gift; GiftMe doesn't add anything on top." },
  { q: 'Where does the money go?', a: 'Straight to the bank account you add in your settings. GiftMe never holds your money.' },
  { q: 'Do my guests need an account?', a: 'No. They open your link, pick a gift and pay by card, bank transfer or USSD. That is all.' },
  { q: 'Can people see how much others gave?', a: 'No. Guests only see how close each gift is to being complete. Only you see names, amounts and notes.' },
  { q: 'What if someone wants to buy the gift themselves?', a: "They tap “Reserve”. Everyone else sees it's taken, so nobody doubles up." },
  { q: 'Is it really open source?', a: 'Yes. All the code is public, and anyone can read it, suggest changes or run their own copy.' },
]

function Faq() {
  return (
    <section className="border-t border-neutral-200/80 py-24 dark:border-neutral-800">
      <SectionTitle kicker="Questions" title="Good to" accent="know" />
      <div className="mt-10 flex max-w-3xl flex-col gap-3">
        {FAQ.map((f) => (
            <details key={f.q} className={`group rounded-2xl px-5 py-4 ${glassCard}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] [&::-webkit-details-marker]:hidden">
                <span className="font-display text-xl">{f.q}</span>
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-neutral-300/70 text-neutral-500 transition-transform duration-300 group-open:rotate-45 dark:border-neutral-700">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{f.a}</p>
            </details>
        ))}
      </div>
    </section>
  )
}

/** The closing call: the gift drops in once more, closed this time, above the last button. */
function FinalCta() {
  const section = useRef<HTMLElement>(null)
  const closed = useRef(0)
  const [scene, setScene] = useState<{ still: boolean; compact: boolean } | null>(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const probe = document.createElement('canvas')
    if (probe.getContext('webgl2') || probe.getContext('webgl')) {
      setScene({ still: window.matchMedia('(prefers-reduced-motion: reduce)').matches, compact: window.innerWidth < 768 })
    }
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section ref={section} className="relative overflow-hidden border-t border-neutral-200/80 pt-10 pb-28 text-center dark:border-neutral-800">
      <div aria-hidden="true" className="relative mx-auto h-[300px] w-full max-w-xl sm:h-[360px]">
        {scene && (
          <Suspense fallback={null}>
            <GiftScene progress={closed} still={scene.still} active={active} compact={scene.compact} layout="center" />
          </Suspense>
        )}
      </div>
      <div className="relative flex flex-col items-center gap-6">
        <h2 className="font-display text-[clamp(44px,7vw,112px)] leading-[0.9] tracking-[-0.01em]">
          Your next <span className="font-editorial text-[1.2em] text-purple-600 dark:text-purple-300">celebration</span>
          <br />
          starts here
        </h2>
        <p className="max-w-md text-[15px] text-neutral-600 dark:text-neutral-400">Sign in with Google or your email. No passwords, no forms to fight with.</p>
        <a href={START_HREF} data-magnetic data-cursor="Let's go ✨" className={`inline-flex min-h-14 items-center px-8 text-base ${primaryButton}`}>
          Create my wishlist
        </a>
      </div>
    </section>
  )
}
