import { useEffect } from 'react'

// Scroll-linked motion for the landing page. Elements get a CSS variable (--s, 0 → 1) that
// follows their position on screen, so styles can animate with plain calc() and React never
// re-renders while you scroll. One shared listener drives every element.

type Tracked = { el: HTMLElement; start: number; end: number; name: string }
const tracked = new Set<Tracked>()
let frame = 0
let listening = false

function update() {
  frame = 0
  const vh = window.innerHeight
  for (const t of tracked) {
    const r = t.el.getBoundingClientRect()
    // start/end are where the element's top sits, as a fraction of the viewport height.
    const from = vh * t.start
    const to = vh * t.end
    const p = Math.min(1, Math.max(0, (from - r.top) / Math.max(1, from - to)))
    t.el.style.setProperty(t.name, p.toFixed(4))
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update)
}

/**
 * Writes scroll progress into `name` (default --s) on the element: 0 when its top reaches
 * `start` of the viewport height (1 = bottom edge), 1 when it reaches `end`.
 */
export function useScrollVar(ref: React.RefObject<HTMLElement | null>, { start = 1, end = 0.35, name = '--s' } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty(name, '1')
      return
    }
    const t = { el, start, end, name }
    tracked.add(t)
    if (!listening) {
      listening = true
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule)
    }
    schedule()
    return () => {
      tracked.delete(t)
    }
  }, [ref, start, end, name])
}

/** Smooth, weighted scrolling for the landing page (skipped for reduced motion and touch). */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null
    let raf = 0
    let cancelled = false
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      lenis = new Lenis({ lerp: 0.11, anchors: { offset: -80 } })
      const loop = (time: number) => {
        lenis?.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      lenis?.destroy()
    }
  }, [])
}

/** Buttons marked data-magnetic lean toward the pointer when it comes close. */
export function useMagnetic() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
          const r = el.getBoundingClientRect()
          const dx = e.clientX - (r.left + r.width / 2)
          const dy = e.clientY - (r.top + r.height / 2)
          const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9
          el.style.transform = near ? `translate(${dx * 0.22}px, ${dy * 0.3}px)` : ''
          el.style.transition = near ? 'transform 0.15s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3)'
        })
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])
}
