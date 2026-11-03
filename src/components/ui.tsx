import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export const glassCard =
  'border border-white/60 bg-white/60 shadow-sm shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/40'

/** The soft purple-pink-blue wash, kept faint behind the header. */
export function Glow({ tall = false }: { tall?: boolean }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${tall ? 'h-[820px]' : 'h-[560px]'}`}>
      <div className="absolute -top-56 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-400/25 via-pink-400/20 to-blue-400/20 blur-3xl dark:from-purple-500/15 dark:via-pink-500/10 dark:to-blue-500/10" />
    </div>
  )
}

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <Link to="/" className="group inline-flex items-baseline gap-0.5" aria-label="GiftMe home">
      <span className={`font-display font-medium tracking-tight ${size === 'lg' ? 'text-4xl' : 'text-[28px]'}`}>Gift</span>
      <span className={`font-editorial bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent ${size === 'lg' ? 'text-5xl' : 'text-[34px]'}`}>
        me
      </span>
    </Link>
  )
}

export function Bar({ percent }: { percent: number }) {
  return (
    <div
      className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-[width] duration-700"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

/** A round profile picture. With `zoom`, pressing it opens the photo full size. */
export function Avatar({ src, name, size = 44, zoom = false }: { src: string | null | undefined; name: string; size?: number; zoom?: boolean }) {
  const [open, setOpen] = useState(false)
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const face = (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-75 blur-sm" />
      {src ? (
        <img src={src} alt={name} className="relative size-full rounded-full object-cover ring-2 ring-white/70 dark:ring-neutral-900/70" />
      ) : (
        <div
          className="font-display relative grid size-full place-items-center rounded-full bg-neutral-100 text-neutral-600 ring-2 ring-white/70 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-900/70"
          style={{ fontSize: size * 0.4 }}
        >
          {initials || '?'}
        </div>
      )}
    </div>
  )
  if (!zoom || !src) return face
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`See ${name}'s photo`}
        className="shrink-0 cursor-zoom-in rounded-full transition-transform hover:scale-105"
      >
        {face}
      </button>
      {open && <PhotoViewer src={src} name={name} onClose={() => setOpen(false)} />}
    </>
  )
}

/** A photo shown big over a dimmed page; Esc, the close button or a press outside closes it. */
function PhotoViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const ref = useModal(onClose)
  return (
    <dialog
      ref={ref}
      aria-label={`${name}'s photo`}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto overflow-visible bg-transparent p-0 backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <figure className="flex flex-col items-center gap-3">
        <img src={src} alt={name} className="max-h-[78vh] max-w-[min(560px,calc(100vw-32px))] rounded-3xl object-contain shadow-2xl" />
        <figcaption className="font-display text-2xl text-white">{name}</figcaption>
      </figure>
      <button
        type="button"
        onClick={() => ref.current?.close()}
        aria-label="Close"
        className="fixed top-5 right-5 grid size-11 cursor-pointer place-items-center rounded-full bg-white/15 text-xl text-white backdrop-blur hover:bg-white/25"
      >
        ×
      </button>
    </dialog>
  )
}

export function GiftIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1zM12 8c2-4 6-4 6-1s-6 1-6 1z" />
    </svg>
  )
}

/** An image that shimmers while it loads, then fades in. Fills its parent. */
export function Photo({
  src,
  alt = '',
  lazy = true,
  className = '',
  position,
}: {
  src: string
  alt?: string
  lazy?: boolean
  className?: string
  /** Vertical focus of a cropped photo, 0 (top) to 100 (bottom). */
  position?: number
}) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true)
  }, [src])
  return (
    <div className={`relative size-full ${loaded ? '' : 'shimmer'} ${className}`}>
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        style={position === undefined ? undefined : { objectPosition: `50% ${position}%` }}
        className={`size-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

/** Stands in for a missing photo: a naira mark for cash funds, a wrapped gift otherwise. */
export function ItemArt({ kind, compact = false }: { kind: 'gift' | 'fund'; compact?: boolean }) {
  return (
    <div className="relative grid size-full place-items-center overflow-hidden bg-gradient-to-br from-purple-200/80 via-pink-100/80 to-blue-200/70 dark:from-purple-500/25 dark:via-pink-500/10 dark:to-blue-500/25">
      <div aria-hidden="true" className="absolute -top-1/3 -left-1/4 size-3/4 rounded-full bg-white/50 blur-2xl dark:bg-white/5" />
      {kind === 'fund' ? (
        <span
          aria-hidden="true"
          className={`font-display relative bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 bg-clip-text leading-none text-transparent ${compact ? 'text-3xl' : 'text-7xl'}`}
        >
          ₦
        </span>
      ) : (
        <span className="relative text-purple-500/80 dark:text-purple-300/80">
          <GiftIcon size={compact ? 26 : 56} />
        </span>
      )}
    </div>
  )
}

export function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />
    </svg>
  )
}

function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!el.open) el.showModal()
    // showModal focuses the close button; start on the first field instead.
    el.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]), textarea, select')?.focus()
    const handle = () => closeRef.current()
    el.addEventListener('close', handle)
    return () => el.removeEventListener('close', handle)
  }, [])
  return ref
}

export function Dialog({
  title,
  subtitle,
  onClose,
  wide = false,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  const ref = useModal(onClose)
  return (
    <dialog
      ref={ref}
      className={`m-auto rounded-2xl bg-neutral-50 p-0 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 ${
        wide ? 'w-[min(760px,calc(100vw-32px))]' : 'w-[min(440px,calc(100vw-32px))]'
      }`}
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-3xl leading-tight">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-mt-1 -mr-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-neutral-900/5 dark:hover:bg-neutral-100/10"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span>
        {label}
        {hint && <span className="text-neutral-500 dark:text-neutral-400"> · {hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return <p className="text-sm text-red-700 dark:text-red-400">{children}</p>
}
