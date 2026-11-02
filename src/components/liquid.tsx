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
 * The mouse pointer on the landing page: an arrow with a "You" name tag, like the friends'
 * cursors in the hero demo. Over links and buttons it shows the `data-cursor` label when one
 * is set and gives a small press. Mouse users only; touch keeps the default.
 */
export function FollowCursor() {
  const pointer = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || still) return
    setEnabled(true)
    // The arrow replaces the system pointer on this page.
    document.documentElement.classList.add('gift-cursor')
    let frame = 0
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // The arrow's tip sits 3px into the svg, so line the tip up with the real pointer.
        if (pointer.current) pointer.current.style.transform = `translate3d(${e.clientX - 3}px, ${e.clientY - 3}px, 0)`
      })
      const target = (e.target as Element | null)?.closest?.('a, button, [data-cursor], summary') as HTMLElement | null
      setOver(!!target)
      setLabel(target?.dataset.cursor ?? null)
    }
    const onLeave = () => {
      if (pointer.current) pointer.current.style.transform = 'translate3d(-100px, -100px, 0)'
    }
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
    <div
      ref={pointer}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[100] will-change-transform"
      style={{ transform: 'translate3d(-100px, -100px, 0)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" className={`drop-shadow-md transition-transform duration-150 ${over ? 'scale-90' : ''}`} style={{ transformOrigin: '4px 3px' }}>
        <path d="M4 3l7 17 2.5-7.5L21 10z" fill="#a855f7" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="absolute top-3 left-3 rounded-full rounded-tl-sm bg-purple-500 px-2 py-0.5 text-[11px] whitespace-nowrap text-white shadow">
        {label ?? 'You'}
      </span>
    </div>
  )
}
