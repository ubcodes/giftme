import { useEffect, useRef, useState } from 'react'
import { Bar, ItemArt, StarIcon } from '@/components/ui'

/**
 * A short, looping walk-through of the real product, drawn in HTML so it stays sharp and
 * light: add a gift from a link, share it, a friend chips in, the money lands and you say
 * thanks. Plays while on screen; the step buttons jump to a scene.
 */
const SCENES = [
  { label: 'Add gifts', hint: 'Paste a link from any shop', ms: 7000 },
  { label: 'Share one link', hint: 'WhatsApp, Instagram, anywhere', ms: 4500 },
  { label: 'Friends chip in', hint: 'Any amount, or reserve it', ms: 5500 },
  { label: 'Money lands, say thanks', hint: 'Straight to your bank', ms: 5000 },
] as const

const URL_TEXT = 'jumia.com.ng/kenwood-stand-mixer'

export function ProductTour() {
  const [scene, setScene] = useState(0)
  const [t, setT] = useState(0)
  const [visible, setVisible] = useState(false)
  const [still, setStill] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // One clock drives every scene; it only runs while the tour is on screen.
  const elapsed = useRef(0)
  useEffect(() => {
    if (!visible || still) return
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      elapsed.current += now - last
      last = now
      if (elapsed.current >= SCENES[scene].ms) {
        elapsed.current = 0
        setScene((scene + 1) % SCENES.length)
      }
      setT(elapsed.current)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, still, scene])

  // With reduced motion each scene shows its finished state.
  const time = still ? 99999 : t
  const jump = (i: number) => {
    elapsed.current = 0
    setScene(i)
    setT(0)
  }

  return (
    <div ref={box} className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:gap-10">
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {SCENES.map((s, i) => (
          <li key={s.label} className="shrink-0">
            <button
              type="button"
              onClick={() => jump(i)}
              data-cursor="Show me"
              aria-current={i === scene}
              className={`group relative flex w-full cursor-pointer flex-col items-start gap-0.5 overflow-hidden rounded-2xl px-4 py-3 text-left transition-colors ${
                i === scene ? 'bg-white/70 shadow-sm dark:bg-white/10' : 'hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2 text-[15px]">
                <span
                  className={`grid size-6 place-items-center rounded-full text-[11px] transition-colors ${
                    i === scene ? 'bg-purple-500 text-white' : 'bg-neutral-900/5 text-neutral-500 dark:bg-white/10 dark:text-neutral-400'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </span>
              <span className="hidden pl-8 text-xs text-neutral-500 lg:block dark:text-neutral-400">{s.hint}</span>
              {i === scene && !still && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"
                  style={{ transform: `scaleX(${Math.min(1, t / s.ms)})` }}
                />
              )}
            </button>
          </li>
        ))}
      </ol>

      <div className="relative min-w-0">
        <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-purple-300/30 via-pink-300/20 to-blue-300/30 blur-2xl dark:from-purple-500/15 dark:via-pink-500/10 dark:to-blue-500/15" />
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-2xl shadow-purple-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70">
          <BrowserBar scene={scene} />
          <div className="relative h-[400px] sm:h-[420px]" aria-live="polite">
            <span className="sr-only">{`Step ${scene + 1}: ${SCENES[scene].label}`}</span>
            <div key={scene} className="word-in absolute inset-0 p-4 sm:p-6">
              {scene === 0 && <AddGiftScene t={time} />}
              {scene === 1 && <ShareScene t={time} />}
              {scene === 2 && <GiveScene t={time} />}
              {scene === 3 && <ThanksScene t={time} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BrowserBar({ scene }: { scene: number }) {
  const path = scene === 2 ? 'giftme.ng/w/amaka/wedding' : scene === 1 ? 'giftme.ng/dashboard/w/wedding' : 'giftme.ng/dashboard'
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
        name="You"
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
      <Cursor name="You" x={copied ? 300 : 110} y={copied ? 330 : 150} click={t > 900 && t < 1400} />
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
      <Cursor name="You" x={thanked ? 470 : 300} y={thanked ? 110 : 260} click={t > 2700 && t < 3100} />
    </div>
  )
}
