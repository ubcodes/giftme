import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { primaryButton, secondaryButton } from '@/lib/ui'

/**
 * A short walk through a page: a GiftMe cursor glides to each part, a spotlight dims the
 * rest, and a note says what it's for. Targets are elements with a matching data-tour
 * attribute; steps whose target isn't on the page are skipped. Shown once per browser
 * (remembered under `storageKey`) and can be replayed.
 */
export type TourStep = { target: string; title: string; body: string }

export function useTour(storageKey: string) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true)
    } catch {
      // Storage can be blocked; then the tour only runs when asked for.
    }
  }, [storageKey])
  const finish = useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // Nothing to remember it in; it may show again next time.
    }
  }, [storageKey])
  return { open, start: () => setOpen(true), finish }
}

type Box = { top: number; left: number; width: number; height: number }

export function GuidedTour({ steps: all, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [steps, setSteps] = useState<TourStep[]>([])
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [vw, setVw] = useState(1200)

  // Only the steps whose element is on this page right now.
  useEffect(() => setSteps(all.filter((s) => document.querySelector(`[data-tour="${s.target}"]`))), [all])
  const step = steps[i]

  useLayoutEffect(() => {
    if (!step) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        setVw(window.innerWidth)
        setBox({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 })
      })
    }
    measure()
    // Settle after the smooth scroll.
    const late = setTimeout(measure, 450)
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(late)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone, steps.length])

  if (!step || !box) return null
  const last = i === steps.length - 1
  // The note goes below the spotlight when there's room, otherwise above it.
  const below = box.top + box.height + 220 < window.innerHeight
  const noteWidth = Math.min(340, vw - 32)
  const noteLeft = Math.min(Math.max(16, box.left), vw - noteWidth - 16)
  const cursor = { x: box.left + Math.min(box.width - 24, Math.max(24, Math.min(box.width * 0.6, 260))), y: box.top + box.height * 0.6 }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Quick tour">
      {/* Clicking the dimmed area ends the tour. */}
      <button type="button" aria-label="Close the tour" onClick={onDone} className="absolute inset-0 cursor-default" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-2xl ring-2 ring-purple-400 transition-all duration-500 ease-[cubic-bezier(0.3,0.9,0.3,1)]"
        style={{ ...box, boxShadow: '0 0 0 9999px rgb(12 6 22 / 0.66)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 transition-transform duration-700 ease-[cubic-bezier(0.45,0,0.2,1)]"
        style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
      >
        <span key={i} className="click-pulse absolute -top-3 -left-3 size-6 rounded-full bg-purple-400/60" />
        <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-md">
          <path d="M4 3l7 17 2.5-7.5L21 10z" fill="#a855f7" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="absolute top-4 left-4 rounded-full rounded-tl-sm bg-purple-500 px-2 py-0.5 text-[11px] whitespace-nowrap text-white shadow">GiftMe</span>
      </div>
      <div
        key={step.target}
        className="word-in absolute flex flex-col gap-3 rounded-2xl border border-purple-300/70 bg-white p-5 shadow-2xl shadow-purple-950/30 dark:border-purple-400/40 dark:bg-neutral-900"
        style={{ width: noteWidth, left: noteLeft, top: below ? box.top + box.height + 16 : undefined, bottom: below ? undefined : window.innerHeight - box.top + 16 }}
      >
        <p className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          {i + 1} of {steps.length}
        </p>
        <p className="font-display text-2xl leading-tight">{step.title}</p>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{step.body}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <button type="button" onClick={onDone} className="cursor-pointer text-sm text-neutral-500 hover:underline dark:text-neutral-400">
            Skip tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className={`min-h-9 px-3.5 text-sm ${secondaryButton}`}>
                Back
              </button>
            )}
            <button type="button" onClick={() => (last ? onDone() : setI(i + 1))} className={`min-h-9 px-4 text-sm ${primaryButton}`} autoFocus>
              {last ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
