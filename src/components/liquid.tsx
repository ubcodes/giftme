import { useEffect, useRef, useState } from 'react'

/**
 * The SVG lens used by `.liquid` surfaces (see styles.css), plus a pointer tracker that
 * moves each surface's highlight toward the cursor. Rendered once at the app root.
 */
export function LiquidGlass() {
  useEffect(() => {
    let frame = 0
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('.liquid') as HTMLElement | null
      if (!el) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
      <filter id="liquid-lens" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="38" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

/**
 * The mouse pointer on the landing page is a little wrapped gift, like the bee on brimble.io.
 * It leans in the direction it's moving, and the lid pops open over links and buttons (with
 * the `data-cursor` label when one is set). Mouse users only; touch keeps the default.
 */
export function FollowCursor() {
  const gift = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || still) return
    setEnabled(true)
    // The gift replaces the system pointer on this page.
    document.documentElement.classList.add('gift-cursor')
    let x = -100
    let y = -100
    let gx = x
    let gy = y
    let tilt = 0
    let frame = 0
    const loop = (t: number) => {
      const dx = x - gx
      // It is the cursor, so it stays close to the pointer: just enough easing to feel alive.
      gx += dx * 0.55
      gy += (y - gy) * 0.55
      // Lean into the movement, settle when still, and bob a little while hovering.
      tilt += (Math.max(-25, Math.min(25, dx * 0.6)) - tilt) * 0.15
      const bob = Math.sin(t / 380) * 1
      if (gift.current) {
        gift.current.style.transform = `translate3d(${gx - 4}px, ${gy - 4 + bob}px, 0)`
        gift.current.style.setProperty('--tilt', `${tilt}deg`)
      }
      frame = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      const target = (e.target as Element | null)?.closest?.('a, button, [data-cursor], summary') as HTMLElement | null
      setOpen(!!target)
      setLabel(target?.dataset.cursor ?? null)
    }
    const onLeave = () => {
      x = -100
      y = -100
    }
    frame = requestAnimationFrame(loop)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      document.documentElement.classList.remove('gift-cursor')
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  if (!enabled) return null
  return (
    <div ref={gift} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-[100] flex items-start gap-1.5 will-change-transform">
      <div style={{ transform: 'rotate(var(--tilt, 0deg))' }}>
      <svg width="26" height="26" viewBox="0 0 32 32" className={`drop-shadow-md transition-transform duration-300 ${open ? 'scale-115' : ''}`}>
        <defs>
          <linearGradient id="gift-box" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c084fc" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        {/* box */}
        <rect x="5" y="14" width="22" height="15" rx="2.5" fill="url(#gift-box)" />
        <rect x="14.5" y="14" width="3" height="15" fill="#fff" opacity="0.9" />
        {/* lid: lifts and tips back over things you can click */}
        <g className="transition-transform duration-300 ease-out" style={{ transformOrigin: '6px 13px', transform: open ? 'translateY(-4px) rotate(-18deg)' : 'none' }}>
          <rect x="3.5" y="9" width="25" height="6" rx="2" fill="#a855f7" />
          <rect x="14.5" y="9" width="3" height="6" fill="#fff" opacity="0.9" />
          <path d="M16 9c-2-4-7-5-7-2s7 2 7 2zM16 9c2-4 7-5 7-2s-7 2-7 2z" fill="#fff" stroke="#ec4899" strokeWidth="1.2" strokeLinejoin="round" />
        </g>
        {open && (
          <g className="word-in">
            <circle cx="10" cy="4" r="1.2" fill="#f59e0b" />
            <circle cx="22" cy="3" r="1" fill="#3b82f6" />
            <circle cx="16" cy="1.5" r="1" fill="#10b981" />
          </g>
        )}
      </svg>
      </div>
      {label && (
        <span className="mt-1 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] whitespace-nowrap text-white shadow dark:bg-white/90 dark:text-neutral-900">
          {label}
        </span>
      )}
    </div>
  )
}
