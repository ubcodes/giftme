import { useEffect, useRef, useState } from 'react'

/**
 * The 45-second launch film (made in video/). It starts playing on its own once it scrolls into
 * view and pauses when it leaves. It tries for sound first; browsers only allow that after the
 * visitor has tapped or typed on the page, so when they refuse it plays muted and the sound comes
 * on with their next tap or key press while it's on screen. With reduced motion it waits for a press.
 */
export function Film() {
  const video = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  // muted: playing without sound until the browser lets it; sound: playing with sound.
  const [mode, setMode] = useState<'idle' | 'muted' | 'sound'>('idle')
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    const v = video.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let visible = false
    const start = async () => {
      if (modeRef.current === 'idle') {
        v.muted = false
        try {
          await v.play()
          setMode('sound')
          return
        } catch {
          v.muted = true
        }
      }
      await v.play().catch(() => {})
      if (modeRef.current === 'idle') setMode('muted')
    }
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) void start()
        else v.pause()
      },
      { threshold: 0.5 },
    )
    io.observe(v)
    // The first tap or key press anywhere counts as permission for sound.
    const unmute = (e: Event) => {
      // Presses on the film itself are handled by its own buttons.
      if (!visible || modeRef.current !== 'muted' || box.current?.contains(e.target as Node)) return
      v.muted = false
      setMode('sound')
    }
    window.addEventListener('pointerdown', unmute, true)
    window.addEventListener('keydown', unmute, true)
    return () => {
      io.disconnect()
      window.removeEventListener('pointerdown', unmute, true)
      window.removeEventListener('keydown', unmute, true)
    }
  }, [])

  function withSound() {
    const v = video.current
    if (!v) return
    v.muted = false
    v.currentTime = 0
    setMode('sound')
    void v.play()
  }

  return (
    <div ref={box} className="relative overflow-hidden rounded-[28px] border border-neutral-200/70 bg-[#f7f3ee] shadow-[0_30px_80px_-30px_rgb(88_28_135/0.35)] dark:border-neutral-800">
      <video
        ref={video}
        className="block aspect-video w-full"
        src="/video/giftme-film.mp4"
        poster="/video/giftme-film.jpg"
        preload="metadata"
        playsInline
        // Silent, it loops quietly; with sound it plays once, then offers to play again.
        loop={mode !== 'sound'}
        onEnded={() => setMode('idle')}
        controls={mode === 'sound'}
      >
        <track kind="captions" src="/video/giftme-film.vtt" srcLang="en" label="English" />
      </video>
      {mode === 'muted' && (
        <button
          type="button"
          data-cursor="Sound on"
          onClick={withSound}
          className="absolute right-4 bottom-4 flex cursor-pointer items-center gap-2 rounded-full bg-white/90 py-2 pr-4 pl-2 text-sm text-neutral-900 shadow-xl backdrop-blur transition-transform hover:scale-105"
          aria-label="Watch the GiftMe film from the start with sound"
        >
          <span className="grid size-8 place-items-center rounded-full bg-purple-500 text-white" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          </span>
          Turn sound on
        </button>
      )}
      {/* Until it starts (or always, with reduced motion), a big play button. */}
      {mode === 'idle' && (
        <button
          type="button"
          data-cursor="Play ▶"
          onClick={withSound}
          className="group absolute inset-0 grid cursor-pointer place-items-center bg-black/0 transition-colors hover:bg-black/10"
          aria-label="Play the GiftMe film, 45 seconds, with sound"
        >
          <span className="flex items-center gap-3 rounded-full bg-white/90 py-3 pr-6 pl-3 text-[15px] text-neutral-900 shadow-xl backdrop-blur transition-transform group-hover:scale-105">
            <span className="grid size-11 place-items-center rounded-full bg-purple-500 text-white" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" />
              </svg>
            </span>
            Watch the film · 0:45
          </span>
        </button>
      )}
    </div>
  )
}
