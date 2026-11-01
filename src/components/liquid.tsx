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
 * A soft glowing ring that trails the pointer, like a presence cursor. It grows over
 * links and buttons and shows a label from `data-cursor="…"`. Mouse users only.
 */
export function FollowCursor() {
  const ring = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || still) return
    setEnabled(true)
    let x = -100
    let y = -100
    let rx = x
    let ry = y
    let frame = 0
    const loop = () => {
      // Ease toward the pointer so the ring lags a little behind it.
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      frame = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      const target = (e.target as Element | null)?.closest?.('a, button, [data-cursor], summary') as HTMLElement | null
      setActive(!!target)
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
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  if (!enabled) return null
  return (
    <div ref={ring} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-[100]">
      <div
        className={`-translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ease-out ${
          label
            ? 'flex h-9 items-center border-white/50 bg-gradient-to-r from-purple-500/85 via-pink-500/85 to-blue-500/85 px-3.5 text-xs whitespace-nowrap text-white shadow-lg backdrop-blur'
            : active
              ? 'size-12 border-purple-400/60 bg-purple-400/10'
              : 'size-7 border-purple-400/50 bg-purple-400/5'
        }`}
      >
        {label}
      </div>
    </div>
  )
}
