import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bar, ItemArt, StarIcon } from '@/components/ui'
import { clamp, easeInOut, prog, spring } from '@/lib/motion'

/**
 * Live, looping demos of one feature each, drawn in HTML so they stay sharp and light.
 * Each landing section shows one of these in a Stage. A demo starts from the top when it
 * scrolls into view, pauses when it leaves, and shows its finished state for reduced motion.
 */
export type SceneName = 'add' | 'search' | 'share' | 'give' | 'thanks' | 'friends'

type SceneSpec = { ms: number; h: string; path: string; label: string; Scene: (p: { t: number }) => React.ReactNode }

const SCENES: Record<SceneName, SceneSpec> = {
  add: { ms: 7600, h: 'h-[400px] sm:h-[380px]', path: 'giftme.ng/dashboard/w/wedding', label: 'A shop link turns into a gift on the list', Scene: AddGiftScene },
  search: { ms: 9800, h: 'h-[440px]', path: 'giftme.ng/dashboard/w/wedding', label: 'Searching shops and adding a result', Scene: SearchScene },
  share: { ms: 5600, h: 'h-[460px] sm:h-[380px]', path: 'giftme.ng/dashboard/w/wedding', label: 'Sharing the wishlist link in a chat', Scene: ShareScene },
  give: { ms: 6200, h: 'h-[560px] sm:h-[400px]', path: 'giftme.ng/w/amaka/wedding', label: 'A friend chips in toward a gift', Scene: GiveScene },
  friends: { ms: 7200, h: 'h-[470px] sm:h-[420px]', path: 'giftme.ng/dashboard/friends', label: 'Finding friends from your contacts and following one', Scene: FriendsScene },
  thanks: { ms: 5800, h: 'h-[440px] sm:h-[400px]', path: 'giftme.ng/dashboard/w/wedding', label: 'The gift lands and a thank-you goes out', Scene: ThanksScene },
}

function useStageClock(ms: number) {
  const box = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(0)
  const [visible, setVisible] = useState(false)
  const [still, setStill] = useState(false)

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.3,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || still) return
    // Start from the top every time the stage comes into view, so nobody walks in mid-story.
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      // rAF timestamps can be a hair older than performance.now(), so never go below zero.
      setT(Math.max(0, now - start) % ms)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, still, ms])

  return { box, t: still ? ms - 400 : t }
}

/** A warm canvas with an app window inside, playing one feature's demo. */
export function Stage({ scene }: { scene: SceneName }) {
  const { ms, h, path, label, Scene } = SCENES[scene]
  const { box, t } = useStageClock(ms)
  return (
    <div
      ref={box}
      className="relative overflow-hidden rounded-[28px] border border-neutral-200/70 bg-gradient-to-br from-[#f6efe6] via-[#f3eaf3] to-[#e9eefb] px-3 pt-6 sm:px-10 sm:pt-10 dark:border-neutral-800 dark:from-neutral-900 dark:via-[#1a1422] dark:to-[#111827]"
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-t-2xl border border-b-0 border-white/80 bg-white/85 shadow-[0_30px_80px_-20px_rgb(88_28_135/0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/80">
        <BrowserBar path={path} />
        <div className={`relative overflow-hidden ${h}`} role="img" aria-label={label}>
          <div className="absolute inset-0 p-4 sm:p-6">
            <Scene t={t} />
          </div>
        </div>
      </div>
    </div>
  )
}

function BrowserBar({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-200/70 px-4 py-2.5 dark:border-neutral-800">
      <span className="flex gap-1.5" aria-hidden="true">
        <i className="size-2.5 rounded-full bg-red-400/80" />
        <i className="size-2.5 rounded-full bg-amber-400/80" />
        <i className="size-2.5 rounded-full bg-emerald-400/80" />
      </span>
      <span className="min-w-0 flex-1 truncate rounded-full bg-neutral-900/5 px-3 py-1 text-center text-[11px] text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
        {path}
      </span>
    </div>
  )
}

const URL_TEXT = 'jumia.com.ng/kenwood-stand-mixer'

function Cursor({ x, y, name, click }: { x: number; y: number; name: string; click?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-20 transition-transform duration-700 ease-[cubic-bezier(0.45,0,0.2,1)]"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      {click && <span className="click-pulse absolute -top-3 -left-3 size-6 rounded-full bg-pink-400/50" />}
      <svg width="18" height="18" viewBox="0 0 24 24" className="drop-shadow-md">
        <path d="M4 3l7 17 2.5-7.5L21 10z" fill="#ec4899" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="absolute top-4 left-4 rounded-full rounded-tl-sm bg-pink-500 px-2 py-0.5 text-[10px] whitespace-nowrap text-white shadow">{name}</span>
    </div>
  )
}

const LIST = [
  { title: 'Weekend in Obudu', price: 250000, img: '/images/demo/beach.jpg', raised: 90000 },
  { title: 'Pour-over coffee set', price: 45000, img: '/images/demo/pour-over.jpg', raised: 45000 },
]

/** Scene 1: the link turns into a gift, which lands in the list, moves to the top and gets a star. */
function AddGiftScene({ t }: { t: number }) {
  const typed = URL_TEXT.slice(0, Math.max(0, Math.floor((t - 300) / 45)))
  const filled = t > 2000
  const saved = t > 3300
  const moved = t > 4600
  const starred = t > 5600
  const mixer = { title: 'Kenwood stand mixer', price: 180000, img: '/images/demo/mixer.jpg', raised: 0, isNew: true }
  const rows = saved ? (moved ? [mixer, ...LIST] : [...LIST, mixer]) : LIST

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl">
          Amaka & Tobi’s <span className="font-editorial text-3xl">wedding</span>
        </p>
        <span className="hidden rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-800 sm:inline dark:text-purple-200">Add a gift</span>
      </div>

      {!saved && (
        <div className="word-in rounded-2xl border border-purple-200/70 bg-white/80 p-3 dark:border-purple-500/30 dark:bg-neutral-900/80">
          <p className="text-[11px] text-neutral-500">Paste a link or search</p>
          <div className="mt-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-[12px] dark:border-neutral-700 dark:bg-neutral-950">
            {typed}
            <span className="caret ml-px inline-block h-3.5 w-px translate-y-0.5 bg-purple-500" />
          </div>
          {filled && (
            <div className="word-in mt-3 flex items-center gap-3">
              <img src="/images/demo/mixer.jpg" alt="" className="size-14 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-lg leading-tight">Kenwood stand mixer</p>
                <p className="text-xs text-neutral-500">₦180,000 · from Jumia</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs transition-colors ${t > 2900 ? 'bg-purple-500 text-white' : 'bg-purple-500/15 text-purple-800 dark:text-purple-200'}`}>
                Save
              </span>
            </div>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const isMixer = 'isNew' in r
          return (
            <li
              key={r.title}
              className={`flex items-center gap-3 rounded-xl border bg-white/80 p-2.5 transition-all duration-500 dark:bg-neutral-900/70 ${
                isMixer && saved && !moved ? 'word-in border-purple-300/70' : 'border-white/70 dark:border-white/10'
              } ${isMixer && moved && !starred ? 'scale-[1.02] shadow-lg shadow-purple-500/10' : ''}`}
            >
              <span className="text-neutral-300 dark:text-neutral-600" aria-hidden="true">
                ⋮⋮
              </span>
              <img src={r.img} alt="" className="size-11 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[15px]">
                  <span className="font-display truncate text-lg leading-tight">{r.title}</span>
                  {isMixer && starred && <span className="word-in rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-800 dark:text-amber-300">Most wanted</span>}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="shrink-0">₦{r.price.toLocaleString()}</span>
                  <div className="flex max-w-32 flex-1">
                    <Bar percent={(r.raised / r.price) * 100} />
                  </div>
                </div>
              </div>
              <span
                className={`grid size-7 place-items-center rounded-full border transition-colors ${
                  isMixer && starred ? 'border-amber-300/70 bg-amber-400/15 text-amber-500' : 'border-neutral-200 text-neutral-300 dark:border-neutral-700'
                }`}
              >
                <StarIcon filled={isMixer && starred} size={13} />
              </span>
            </li>
          )
        })}
      </ul>
      <Cursor
        name="Amaka"
        x={!filled ? 120 : !saved ? 420 : !moved ? 160 : 470}
        y={!filled ? 80 : !saved ? 140 : !moved ? 220 : 90}
        click={t > 2900 && t < 3400}
      />
    </div>
  )
}

/** Scene 2: copy the link and it shows up in a chat as a rich preview. */
function ShareScene({ t }: { t: number }) {
  const copied = t > 1000
  const sent = t > 1900
  const reply = t > 3200
  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-3 self-start rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <p className="font-display text-2xl">Share your wishlist</p>
        <div className="truncate rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          giftme.ng/w/amaka/wedding
        </div>
        <div className="flex gap-2">
          <span className={`flex-1 rounded-full py-2 text-center text-xs transition-colors ${copied ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-purple-500/15 text-purple-800 dark:text-purple-200'}`}>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </span>
          <span className="flex-1 rounded-full border border-neutral-200 py-2 text-center text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">WhatsApp</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-[#e7ded5] p-3 dark:bg-[#0b141a]">
        <p className="text-center text-[10px] text-neutral-500">Family group 💛</p>
        {sent && (
          <div className="word-in ml-auto w-[85%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-1.5 text-[12px] text-neutral-800 shadow-sm dark:bg-[#005c4b] dark:text-neutral-100">
            <div className="overflow-hidden rounded-lg bg-white/70 dark:bg-black/20">
              <img src="/images/demo/couple.jpg" alt="" className="h-20 w-full object-cover" />
              <div className="p-2">
                <p className="font-medium">Amaka & Tobi’s wedding · GiftMe</p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-300">Chip in toward a gift, or reserve one to buy yourself.</p>
              </div>
            </div>
            <p className="px-1 pt-1.5">Our wishlist is up! 🥹 giftme.ng/w/amaka/wedding</p>
          </div>
        )}
        {reply && (
          <div className="word-in mr-auto max-w-[80%] rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-[12px] text-neutral-800 shadow-sm dark:bg-[#202c33] dark:text-neutral-100">
            <p className="text-[10px] text-pink-600">Aunty Chioma</p>
            Ah! Sending something now 🎁
          </div>
        )}
      </div>
      <Cursor name="Amaka" x={copied ? 300 : 110} y={copied ? 330 : 150} click={t > 900 && t < 1400} />
    </div>
  )
}

/** Scene 3: a friend opens the link, picks an amount and the bar fills. */
function GiveScene({ t }: { t: number }) {
  const open = t > 1200
  const picked = t > 2200
  const paid = t > 3300
  const percent = paid ? 64 : 53
  return (
    <div className="flex h-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
      <div className="w-full max-w-[250px] overflow-hidden rounded-2xl border border-white/70 bg-white/85 dark:border-white/10 dark:bg-neutral-900/80">
        <img src="/images/demo/mixer.jpg" alt="" className="h-28 w-full object-cover" />
        <div className="flex flex-col gap-2 p-3">
          <span className="flex items-center gap-1 self-start rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-800 dark:text-amber-300">
            <StarIcon filled size={10} /> Most wanted
          </span>
          <p className="font-display text-xl leading-tight">Kenwood stand mixer</p>
          <p className="text-[11px] text-neutral-500">₦180,000</p>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <Bar percent={percent} />
            <span className="w-8 text-right">{percent}%</span>
          </div>
          <div className="flex gap-2">
            <span className={`flex-1 rounded-full py-1.5 text-center text-xs transition-colors ${open ? 'bg-purple-500 text-white' : 'bg-purple-500/15 text-purple-800 dark:text-purple-200'}`}>Contribute</span>
            <span className="flex-1 rounded-full border border-neutral-200 py-1.5 text-center text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">Reserve</span>
          </div>
        </div>
      </div>

      {open && (
        <div className="word-in w-full max-w-[250px] rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900/90">
          {!paid ? (
            <>
              <p className="font-display text-xl">Kenwood stand mixer</p>
              <p className="text-[11px] text-neutral-500">₦84,000 to go</p>
              <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                {[5000, 10000, 20000, 50000].map((v) => (
                  <span
                    key={v}
                    className={`rounded-full border py-1.5 text-center transition-colors ${
                      picked && v === 20000 ? 'border-purple-400 bg-purple-500/15 text-purple-800 dark:text-purple-200' : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    ₦{v.toLocaleString()}
                  </span>
                ))}
              </div>
              <p className="mt-3 rounded-xl border border-neutral-200 px-3 py-2 text-[11px] text-neutral-500 dark:border-neutral-700">
                {picked ? 'Happy married life! 💐' : 'A note (optional)'}
              </p>
              <span className={`mt-3 block rounded-full py-2 text-center text-xs ${picked ? 'bg-purple-500 text-white' : 'bg-purple-500/15 text-purple-800 dark:text-purple-200'}`}>
                Give {picked ? '₦20,000' : ''}
              </span>
            </>
          ) : (
            <div className="word-in flex flex-col items-center gap-2 py-6 text-center">
              <span className="text-3xl" aria-hidden="true">
                🎉
              </span>
              <p className="font-editorial text-4xl leading-none">Thank you</p>
              <p className="text-[11px] text-neutral-500">Your gift is in. Paid securely by card or transfer.</p>
            </div>
          )}
        </div>
      )}
      <Cursor name="Chioma" x={!open ? 120 : !picked ? 400 : !paid ? 380 : 420} y={!open ? 330 : !picked ? 170 : 300} click={(t > 1100 && t < 1500) || (t > 2100 && t < 2500) || (t > 3200 && t < 3600)} />
    </div>
  )
}

/** Scene 4: the owner sees who gave, the money is on its way to the bank, and a thank-you goes out. */
function ThanksScene({ t }: { t: number }) {
  const bank = t > 1200
  const thanked = t > 2800
  return (
    <div className="flex h-full flex-col gap-3">
      <p className="font-display text-2xl">Who gave</p>
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 text-[12px] dark:border-white/10 dark:bg-neutral-900/70">
        {[
          { name: 'Chioma A.', amount: 20000, note: 'Happy married life! 💐', item: 'Stand mixer', fresh: true },
          { name: 'Tunde', amount: 10000, note: 'Congrats you two', item: 'Weekend in Obudu' },
          { name: 'Ife', amount: 45000, note: 'For your morning coffee ☕️', item: 'Pour-over set' },
        ].map((r, i) => (
          <div key={r.name} className={`flex items-center gap-3 border-t border-neutral-200/70 px-3 py-2.5 first:border-t-0 dark:border-neutral-800 ${r.fresh ? 'word-in bg-purple-500/5' : ''}`}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-purple-200 to-pink-200 text-[11px] text-purple-800 dark:from-purple-500/30 dark:to-pink-500/30 dark:text-purple-200">
              {r.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <span className="font-medium">{r.name}</span> <span className="text-neutral-500">· {r.item}</span>
              </p>
              <p className="truncate text-[11px] text-neutral-500">“{r.note}”</p>
            </div>
            <span className="shrink-0">₦{r.amount.toLocaleString()}</span>
            {i === 0 ? (
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors ${thanked ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-purple-500/15 text-purple-800 dark:text-purple-200'}`}>
                {thanked ? 'Thanked ✓' : 'Say thanks'}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">Thanked ✓</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        {bank && (
          <div className="word-in flex flex-1 items-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-lg dark:border-white/10 dark:bg-neutral-900/85">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600" aria-hidden="true">
              ₦
            </span>
            <div className="text-[12px]">
              <p className="font-medium">₦20,000 on its way to your bank</p>
              <p className="text-neutral-500">GiftMe never holds your money</p>
            </div>
          </div>
        )}
        {thanked && (
          <div className="word-in flex flex-1 items-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-lg dark:border-white/10 dark:bg-neutral-900/85">
            <span className="size-9 overflow-hidden rounded-xl">
              <ItemArt kind="gift" compact />
            </span>
            <div className="text-[12px]">
              <p className="font-medium">Thank-you note sent to Chioma</p>
              <p className="text-neutral-500">“We love it! Cakes on us 🎂”</p>
            </div>
          </div>
        )}
      </div>
      <Cursor name="Amaka" x={thanked ? 470 : 300} y={thanked ? 110 : 260} click={t > 2700 && t < 3100} />
    </div>
  )
}

type Result = { title: string; price: number; shop: string; domain: string }
const SEARCHES: {
  query: string
  img: string
  pick: number
  results: Result[]
}[] = [
  {
    query: 'polaroid camera',
    img: '/images/demo/camera.jpg',
    pick: 2,
    results: [
      {
        title: 'Polaroid instant camera',
        price: 119985,
        shop: 'Jumia',
        domain: 'jumia.com.ng',
      },
      {
        title: 'Polaroid instant camera',
        price: 124500,
        shop: 'Konga',
        domain: 'konga.com',
      },
      {
        title: 'Polaroid Spirit 600',
        price: 96000,
        shop: 'Jiji',
        domain: 'jiji.ng',
      },
      {
        title: 'Polaroid instant camera',
        price: 98300,
        shop: 'Amazon',
        domain: 'amazon.com',
      },
      {
        title: 'Vintage Polaroid 600',
        price: 104700,
        shop: 'eBay',
        domain: 'ebay.com',
      },
      {
        title: 'Instant film camera',
        price: 89900,
        shop: 'Walmart',
        domain: 'walmart.com',
      },
    ],
  },
  {
    query: 'wireless headphones',
    img: '/images/demo/headphones.jpg',
    pick: 0,
    results: [
      {
        title: 'Over-ear wireless headphones',
        price: 45500,
        shop: 'Jumia',
        domain: 'jumia.com.ng',
      },
      {
        title: 'Bluetooth headphones',
        price: 48000,
        shop: 'Konga',
        domain: 'konga.com',
      },
      {
        title: 'Wireless headset',
        price: 52999,
        shop: 'Slot',
        domain: 'slot.ng',
      },
      {
        title: 'Over-ear headphones',
        price: 41200,
        shop: 'Amazon',
        domain: 'amazon.com',
      },
      {
        title: 'Foldable headphones',
        price: 28600,
        shop: 'Temu',
        domain: 'temu.com',
      },
      {
        title: 'Noise-cancelling headphones',
        price: 47900,
        shop: 'Best Buy',
        domain: 'bestbuy.com',
      },
    ],
  },
]
const SEARCH_LEN = 4.9

/**
 * Type what you want and results from shops in Nigeria and abroad burst out of the search
 * box, land in place, and the picked one flies onto the wishlist.
 */
function SearchScene({ t }: { t: number }) {
  const s = t / 1000
  const round = Math.floor(s / SEARCH_LEN) % SEARCHES.length
  const u = s % SEARCH_LEN
  const { query, img, pick, results } = SEARCHES[round]

  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const [geo, setGeo] = useState<{
    fromInput: { x: number; y: number }[]
    toPill: { x: number; y: number }[]
    centers: { x: number; y: number }[]
    inputAt: { x: number; y: number }
  } | null>(null)

  // Where each card sits relative to the search box and the wishlist pill, for the flights.
  useLayoutEffect(() => {
    const measure = () => {
      const r = root.current?.getBoundingClientRect()
      const i = input.current?.getBoundingClientRect()
      const p = pill.current?.getBoundingClientRect()
      if (!r || !i || !p) return
      const mid = (b: DOMRect) => ({
        x: b.left + b.width / 2,
        y: b.top + b.height / 2,
      })
      const boxes = cards.current.map((c) => c?.getBoundingClientRect()).filter(Boolean) as DOMRect[]
      const im = mid(i)
      const pm = mid(p)
      setGeo({
        fromInput: boxes.map((b) => ({
          x: im.x - mid(b).x,
          y: im.y - mid(b).y,
        })),
        toPill: boxes.map((b) => ({ x: pm.x - mid(b).x, y: pm.y - mid(b).y })),
        centers: boxes.map((b) => ({
          x: mid(b).x - r.left,
          y: mid(b).y - r.top,
        })),
        inputAt: {
          x: i.left - r.left + 40 + Math.min(query.length, 20) * 7,
          y: im.y - r.top + 6,
        },
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [query])

  const typed = query.slice(0, Math.max(0, Math.floor((u - 0.2) * 18)))
  const searching = u > 1.15 && u < 1.45
  const burstAt = 1.4
  const clickAt = 3.05
  const added = u > 3.95
  const count = 3 + round + (added ? 1 : 0)
  const bump = added ? 1 + 0.18 * Math.sin(Math.min(1, (u - 3.95) / 0.35) * Math.PI) : 1
  const exit = prog(u, 4.45, 4.8)

  const cursor = !geo
    ? { x: 160, y: 120 }
    : u < 2.35
      ? geo.inputAt
      : u < 3.5
        ? geo.centers[pick]
        : { x: geo.centers[pick].x + 30, y: geo.centers[pick].y + 60 }

  return (
    <div ref={root} className="relative flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl">Add a gift</p>
        <span
          ref={pill}
          className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-800 tabular-nums dark:text-purple-200"
          style={{ transform: `scale(${bump})` }}
        >
          🎁 Wishlist · {count} gifts
        </span>
      </div>

      <div
        ref={input}
        className="flex items-center gap-2 rounded-xl border border-purple-300/70 bg-white px-3 py-2.5 text-[13px] shadow-sm dark:border-purple-500/40 dark:bg-neutral-950"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="shrink-0 text-neutral-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="truncate">
          {typed}
          {u < 1.3 && <span className="caret ml-px inline-block h-3.5 w-px translate-y-0.5 bg-purple-500" />}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-neutral-400">
          {searching ? 'Searching shops…' : added ? (
            <span className="word-in inline-block text-emerald-600 dark:text-emerald-400">✓ Added from {results[pick].shop}</span>
          ) : u > burstAt ? (
            '6 results'
          ) : (
            ''
          )}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {[0, 1].map((row) => (
          <div key={row} className="flex flex-col gap-1.5">
            <p
              className="text-[10px] tracking-[0.14em] text-neutral-500 uppercase"
              style={{
                opacity: clamp((u - burstAt - row * 0.15) * 4) * (1 - exit),
              }}
            >
              {row === 0 ? 'Sold in Nigeria' : 'International shops'}
              {row === 1 && <span className="tracking-normal normal-case"> · prices in naira</span>}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {results.slice(row * 3, row * 3 + 3).map((r, k) => {
                const i = row * 3 + k
                const from = geo?.fromInput[i] ?? { x: 0, y: -120 }
                const p = spring(u - burstAt - i * 0.07, 190, 19)
                const isPick = i === pick
                const fly = isPick ? easeInOut(prog(u, 3.4, 3.95)) : 0
                const to = geo?.toPill[i] ?? { x: 0, y: 0 }
                const press = isPick && u > clickAt && u < clickAt + 0.18 ? 0.95 : 1
                const x = from.x * (1 - p) + to.x * fly
                const y = from.y * (1 - p) + to.y * fly + (isPick ? 0 : exit * 14)
                const scale = (0.25 + 0.75 * p) * (1 - 0.82 * fly) * press
                const rot = (i % 2 ? -1 : 1) * (10 + i * 3) * (1 - p)
                const opacity = clamp(p * 3) * (isPick ? 1 - prog(u, 3.85, 3.97) : 1 - exit)
                return (
                  // The slot keeps the untransformed layout box, so measuring it gives each card's resting place.
                  <div
                    key={`${round}-${i}`}
                    ref={(el) => {
                      cards.current[i] = el
                    }}
                  >
                    <div
                      className={`relative overflow-hidden rounded-xl border bg-white text-left dark:bg-neutral-900 ${
                        isPick && u > clickAt - 0.25
                          ? 'border-purple-400 shadow-lg shadow-purple-500/20'
                          : 'border-neutral-200/80 dark:border-neutral-800'
                      }`}
                      style={{
                        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`,
                        opacity,
                        zIndex: isPick ? 2 : 1,
                      }}
                    >
                      <div className="relative h-12 bg-white sm:h-16">
                        <img
                          src={img}
                          alt=""
                          className="size-full object-cover"
                          style={{
                            objectPosition: `${30 + k * 20}% ${40 + row * 15}%`,
                          }}
                        />
                        <span
                          className="absolute top-1 left-1 rounded-full bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-white"
                          style={{ opacity: 1 - clamp((p - 0.6) * 4) }}
                        >
                          {r.domain}
                        </span>
                      </div>
                      <div className="flex flex-col p-1.5 sm:p-2">
                        <span className="truncate text-[11px] leading-snug sm:text-xs">{r.title}</span>
                        <span className="text-[11px] tabular-nums sm:text-xs">₦{r.price.toLocaleString()}</span>
                        <span className="truncate text-[10px] text-neutral-500">{r.shop}</span>
                      </div>
                      {isPick && u > clickAt && (
                        <span className="absolute inset-0 grid place-items-center bg-purple-500/85 text-[11px] text-white">Added ✓</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Cursor name="Amaka" x={cursor.x} y={cursor.y} click={u > clickAt && u < clickAt + 0.45} />
    </div>
  )
}

const CONTACTS = ['Aunty Ngozi', 'Bayo', 'Chioma A.', 'Dami', 'Ife Okafor', 'Kemi Adeyemi', 'Mummy ❤️', 'Tunde Bakare']
const FOUND = [
  { name: 'Tunde Bakare', handle: 'tunde', list: 'Tunde’s 30th', when: 'Birthday · 18 days to go', tint: 'from-amber-200 to-rose-200', social: 'instagram' as const },
  { name: 'Kemi Adeyemi', handle: 'kemi', list: 'Baby Adeyemi is coming', when: 'Baby shower · 74 days', tint: 'from-sky-200 to-violet-200', social: 'tiktok' as const },
  { name: 'Ife Okafor', handle: 'ife', list: 'Ife’s graduation', when: 'Graduation · 30 days', tint: 'from-emerald-200 to-sky-200', social: 'x' as const },
]

/** Pick contacts, see who's on GiftMe with their next celebration, follow one. */
function FriendsScene({ t }: { t: number }) {
  const s = t / 1000
  const picking = s > 0.95 && s < 2.45
  const found = s > 2.5
  const followed = s > 4.3
  const ticked = Math.floor(prog(s, 1.25, 2.1) * CONTACTS.length)
  // The Follow buttons sit on the right edge, so aim at them from the stage's real width.
  const root = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)
  useLayoutEffect(() => {
    const measure = () => root.current && setWidth(root.current.offsetWidth)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const cursor = s < 0.6 ? { x: width * 0.55, y: 260 } : s < 2.4 ? (s < 1.5 ? { x: 92, y: 124 } : { x: 200, y: 210 }) : s < 3.7 ? { x: width * 0.6, y: 300 } : { x: width - 34, y: 112 }
  return (
    <div ref={root} className="relative flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl">
          Find your <span className="font-editorial text-3xl">people</span>
        </p>
        {followed && (
          <span className="word-in rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-800 dark:text-amber-300">🎂 Tunde’s 30th in 18 days</span>
        )}
      </div>
      {!found && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
          <p className="text-[13px] text-neutral-600 dark:text-neutral-300">See which of your contacts are on GiftMe. Numbers are scrambled on your phone first.</p>
          <span className={`self-start rounded-full px-4 py-2 text-xs transition-colors ${s > 0.85 ? 'bg-purple-500 text-white' : 'bg-purple-500/15 text-purple-800 dark:text-purple-200'}`}>
            Choose contacts
          </span>
          {picking && (
            <ul className="word-in grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
              {CONTACTS.map((c, i) => (
                <li key={c} className="flex items-center gap-2">
                  <span className={`grid size-4 place-items-center rounded border text-[9px] ${i < ticked ? 'border-purple-500 bg-purple-500 text-white' : 'border-neutral-300 dark:border-neutral-600'}`}>
                    {i < ticked ? '✓' : ''}
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {found && (
        <>
          <p className="word-in text-[12px] text-neutral-500">3 of your 214 contacts are on GiftMe</p>
          <ul className="flex flex-col gap-2">
            {FOUND.map((f, i) => {
              const p = spring(s - 2.55 - i * 0.12, 210, 20)
              const isTunde = i === 0
              return (
                <li
                  key={f.handle}
                  className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/85 p-2.5 dark:border-white/10 dark:bg-neutral-900/75"
                  style={{ transform: `translateY(${(1 - p) * 26}px) scale(${0.94 + 0.06 * p})`, opacity: clamp(p * 2) }}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[12px] text-neutral-700 ${f.tint}`}>
                    {f.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[14px]">
                      {f.name}
                      <span className="text-neutral-400">
                        <SocialGlyph kind={f.social} />
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {f.list} · {f.when}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                      isTunde && followed ? 'border border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300' : 'bg-purple-500/15 text-purple-800 dark:text-purple-200'
                    }`}
                  >
                    {isTunde && followed ? 'Following' : 'Follow'}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <Cursor name="Amaka" x={cursor.x} y={cursor.y} click={(s > 0.8 && s < 1.2) || (s > 4.1 && s < 4.5)} />
    </div>
  )
}

function SocialGlyph({ kind }: { kind: 'instagram' | 'tiktok' | 'x' }) {
  if (kind === 'instagram')
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    )
  if (kind === 'tiktok')
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.6 3c.4 2.2 1.8 3.7 4 3.9v3.1a7.4 7.4 0 0 1-4-1.2v6.4a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v3.2a2.7 2.7 0 1 0 1.8 2.5V3h3.1z" />
      </svg>
    )
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.9L17.8 3z" />
    </svg>
  )
}
