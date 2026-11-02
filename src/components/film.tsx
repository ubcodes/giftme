import { useRef, useState } from 'react'

/**
 * The 40-second launch film (made in video/), shown with its poster until someone presses
 * play. It plays with sound on that first press, then the native controls take over.
 */
export function Film() {
  const video = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-neutral-200/70 bg-[#f7f3ee] shadow-[0_30px_80px_-30px_rgb(88_28_135/0.35)] dark:border-neutral-800">
      <video
        ref={video}
        className="block aspect-video w-full"
        src="/video/giftme-film.mp4"
        poster="/video/giftme-film.jpg"
        preload="none"
        playsInline
        controls={started}
        onEnded={() => setStarted(false)}
      >
        <track kind="captions" src="/video/giftme-film.vtt" srcLang="en" label="English" />
      </video>
      {!started && (
        <button
          type="button"
          data-cursor="Play ▶"
          onClick={() => {
            setStarted(true)
            void video.current?.play()
          }}
          className="group absolute inset-0 grid cursor-pointer place-items-center bg-black/0 transition-colors hover:bg-black/10"
          aria-label="Play the GiftMe film, 40 seconds, with sound"
        >
          <span className="flex items-center gap-3 rounded-full bg-white/90 py-3 pr-6 pl-3 text-[15px] text-neutral-900 shadow-xl backdrop-blur transition-transform group-hover:scale-105">
            <span className="grid size-11 place-items-center rounded-full bg-purple-500 text-white" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" />
              </svg>
            </span>
            Watch the film · 0:40
          </span>
        </button>
      )}
    </div>
  )
}
