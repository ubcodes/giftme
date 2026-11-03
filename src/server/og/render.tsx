import satori from 'satori'
import sharp from 'sharp'
import { countdownText, formatDate } from '@/lib/dates'
import { occasion } from '@/lib/occasions'
import { safeFetch } from '../net'
import { readLocalMedia } from '../storage'
import gift from './gift.png?inline'
import bellezaLatin from '@fontsource/belleza/files/belleza-latin-400-normal.woff?inline'
import bellezaExt from '@fontsource/belleza/files/belleza-latin-ext-400-normal.woff?inline'
import bilbo from '@fontsource/bilbo/files/bilbo-latin-400-normal.woff?inline'
import cormorant from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff?inline'
import cormorantExt from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-400-normal.woff?inline'
import cormorantItalic from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff?inline'

// Link-preview pictures (1200 × 630) drawn on the server: one for the site, one per wishlist and
// one per profile. Layouts are written as JSX, turned into SVG by satori, then into a JPEG by sharp.

const W = 1200
const H = 630
const INK = '#1a1523'
const MUTED = '#6b6275'
const PURPLE = '#9333ea'

const bytes = (dataUri: string) => Buffer.from(dataUri.slice(dataUri.indexOf(',') + 1), 'base64')
const FONTS = [
  { name: 'Cormorant', data: bytes(cormorant), weight: 400 as const, style: 'normal' as const },
  { name: 'Cormorant', data: bytes(cormorantExt), weight: 400 as const, style: 'normal' as const },
  { name: 'Cormorant', data: bytes(cormorantItalic), weight: 400 as const, style: 'italic' as const },
  { name: 'Belleza', data: bytes(bellezaLatin), weight: 400 as const, style: 'normal' as const },
  { name: 'Belleza', data: bytes(bellezaExt), weight: 400 as const, style: 'normal' as const },
  { name: 'Bilbo', data: bytes(bilbo), weight: 400 as const, style: 'normal' as const },
]

async function toJpeg(node: React.ReactNode) {
  const svg = await satori(node as React.ReactElement, { width: W, height: H, fonts: FONTS })
  return sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toBuffer()
}

/** Reads a stored or remote image and crops it to w × h (pos: 0 = keep the top, 100 = the bottom). */
async function photo(url: string | null | undefined, w: number, h: number, pos = 50) {
  if (!url) return null
  try {
    let input: Buffer | null = null
    if (url.startsWith('/media/')) input = (await readLocalMedia(url.slice('/media/'.length)))?.bytes ?? null
    else if (/^https?:\/\//.test(url)) {
      const res = await safeFetch(url, { accept: 'image/*', maxBytes: 8_000_000, timeoutMs: 5000 })
      if (res.status < 400) input = res.body
    }
    if (!input) return null
    const tw = w * 2
    const th = h * 2
    const meta = await sharp(input).metadata()
    if (!meta.width || !meta.height) return null
    const scale = Math.max(tw / meta.width, th / meta.height)
    const rw = Math.max(tw, Math.round(meta.width * scale))
    const rh = Math.max(th, Math.round(meta.height * scale))
    const out = await sharp(input)
      .rotate()
      .resize(rw, rh)
      .extract({ left: Math.round((rw - tw) / 2), top: Math.round(((rh - th) * pos) / 100), width: tw, height: th })
      .jpeg({ quality: 84 })
      .toBuffer()
    return `data:image/jpeg;base64,${out.toString('base64')}`
  } catch {
    return null
  }
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: W,
        height: H,
        display: 'flex',
        position: 'relative',
        backgroundColor: '#fbf7f2',
        backgroundImage:
          'radial-gradient(circle at 12% 8%, rgba(192,132,252,0.45), rgba(192,132,252,0) 42%), radial-gradient(circle at 92% 14%, rgba(244,114,182,0.32), rgba(244,114,182,0) 40%), radial-gradient(circle at 80% 100%, rgba(147,197,253,0.40), rgba(147,197,253,0) 45%)',
        fontFamily: 'Belleza',
        color: INK,
      }}
    >
      {children}
    </div>
  )
}

function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <span style={{ fontFamily: 'Cormorant', fontSize: size, color: INK }}>Gift</span>
      <span
        style={{
          fontFamily: 'Bilbo',
          fontSize: size * 1.12,
          marginLeft: size * 0.06,
          backgroundImage: 'linear-gradient(90deg, #a855f7, #ec4899 55%, #3b82f6)',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        me
      </span>
    </div>
  )
}

/** An amount in naira. None of the bundled fonts has the ₦ sign, so it's an N with two bars. */
function Naira({ amount, size }: { amount: number; size: number }) {
  const bar = { position: 'absolute' as const, left: -size * 0.06, width: size * 0.66, height: Math.max(2, size * 0.06), backgroundColor: INK }
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: 'Cormorant', fontSize: size, color: INK }}>
      <div style={{ display: 'flex', position: 'relative' }}>
        <span>N</span>
        <div style={{ ...bar, top: size * 0.42 }} />
        <div style={{ ...bar, top: size * 0.56 }} />
      </div>
      <span>{amount.toLocaleString('en-NG')}</span>
    </div>
  )
}

function Arrow() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function Pill({ children, arrow = false }: { children: React.ReactNode; arrow?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'flex-start',
        padding: '14px 26px',
        borderRadius: 999,
        backgroundImage: 'linear-gradient(90deg, #9333ea, #c026d3)',
        color: 'white',
        fontSize: 26,
        boxShadow: '0 14px 30px -12px rgba(126,34,206,0.6)',
      }}
    >
      {children}
      {arrow && <Arrow />}
    </div>
  )
}

/** The site-wide picture: the headline beside the open 3D gift. */
export function siteImage() {
  return toJpeg(
    <Backdrop>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 640, paddingLeft: 80, gap: 26 }}>
        <Wordmark size={46} />
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Cormorant', fontSize: 70, lineHeight: 1.04, letterSpacing: -1 }}>
          <span>Everything you'd</span>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'Bilbo', fontSize: 88, color: PURPLE, marginRight: 16 }}>love,</span>
            <span>one link away.</span>
          </div>
        </div>
        <span style={{ fontSize: 26, color: MUTED, lineHeight: 1.4, maxWidth: 500 }}>
          Add gifts from any shop. Friends chip in or buy them for you, for any celebration.
        </span>
        <Pill>giftme.website</Pill>
      </div>
      <img src={gift} width={560} height={589} style={{ position: 'absolute', right: 20, top: 26, objectFit: 'contain' }} />
    </Backdrop>,
  )
}

type WishlistData = {
  owner: { displayName: string; avatarUrl: string | null }
  wishlist: { title: string; occasion: string; eventDate: string | null; coverUrl: string | null; coverPos: number }
  items: { title: string; imageUrl: string | null; priceNgn: number | null; mostWanted: boolean; state: string }[]
}

/**
 * A wishlist's picture. With a banner, the banner (framed the way the owner set it) runs across the
 * top. Without one, its first few gift photos fan out beside the title; with none, the 3D gift.
 */
export async function wishlistImage({ owner, wishlist, items }: WishlistData) {
  const first = owner.displayName.split(' ')[0]
  const when = [occasion(wishlist.occasion).label, wishlist.eventDate && formatDate(wishlist.eventDate)].filter(Boolean).join(' · ')
  const countdown = wishlist.eventDate ? countdownText(wishlist.eventDate) : null
  const avatar = await photo(owner.avatarUrl, 72, 72)
  const titleSize = wishlist.title.length > 34 ? 58 : wishlist.title.length > 22 ? 70 : 84

  const byline = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {avatar ? (
        <img src={avatar} width={60} height={60} style={{ borderRadius: 999, border: '3px solid white', boxShadow: '0 6px 18px rgba(88,28,135,0.25)' }} />
      ) : (
        <div style={{ display: 'flex', width: 60, height: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ede4fb', fontFamily: 'Cormorant', fontSize: 28, color: PURPLE }}>
          {first.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span style={{ fontSize: 26, color: MUTED }}>{first}'s wishlist on</span>
      <Wordmark size={34} />
    </div>
  )
  const kicker = <span style={{ fontSize: 22, letterSpacing: 4, color: MUTED, textTransform: 'uppercase' }}>{when}</span>
  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <Pill arrow>Send a gift</Pill>
      {countdown && <span style={{ fontFamily: 'Bilbo', fontSize: 44, color: PURPLE }}>{countdown}</span>}
    </div>
  )

  if (wishlist.coverUrl) {
    const banner = await photo(wishlist.coverUrl, 1136, 360, wishlist.coverPos)
    if (banner) {
      return toJpeg(
        <Backdrop>
          <div style={{ display: 'flex', flexDirection: 'column', padding: 32, gap: 24, width: W }}>
            <img src={banner} width={1136} height={360} style={{ borderRadius: 28, boxShadow: '0 20px 40px -20px rgba(88,28,135,0.4)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingLeft: 12, paddingRight: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760 }}>
                {kicker}
                <span style={{ fontFamily: 'Cormorant', fontSize: Math.min(titleSize, 68), lineHeight: 1.02 }}>{wishlist.title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                {countdown && <span style={{ fontFamily: 'Bilbo', fontSize: 40, color: PURPLE }}>{countdown}</span>}
                <Pill arrow>Send a gift</Pill>
              </div>
            </div>
            <div style={{ display: 'flex', position: 'absolute', top: 52, left: 52, padding: '8px 18px 8px 8px', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
              {byline}
            </div>
          </div>
        </Backdrop>,
      )
    }
  }

  const picks = [...items]
    .filter((i) => i.imageUrl)
    .sort((a, b) => Number(b.mostWanted) - Number(a.mostWanted) || Number(a.state !== 'open') - Number(b.state !== 'open'))
    .slice(0, 3)
  const shots = (await Promise.all(picks.map((i) => photo(i.imageUrl, 230, 230)))).map((src, n) => ({ src, item: picks[n] })).filter((s) => s.src)
  const spots = [
    [{ left: 770, top: 150, rotate: -6 }],
    [
      { left: 660, top: 170, rotate: -8 },
      { left: 900, top: 100, rotate: 6 },
    ],
    [
      { left: 650, top: 150, rotate: -9 },
      { left: 910, top: 70, rotate: 7 },
      { left: 790, top: 300, rotate: -2 },
    ],
  ][Math.max(0, Math.min(2, picks.length - 1))]

  return toJpeg(
    <Backdrop>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640, padding: '56px 40px 56px 72px' }}>
        {byline}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {kicker}
          <span style={{ fontFamily: 'Cormorant', fontSize: titleSize, lineHeight: 1.02, letterSpacing: -0.5 }}>{wishlist.title}</span>
        </div>
        {footer}
      </div>
      {shots.length > 0 ? (
        shots.map(({ src, item }, n) => (
          <div
            key={n}
            style={{
              position: 'absolute',
              left: spots[n].left,
              top: spots[n].top,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '14px 14px 16px',
              backgroundColor: 'white',
              borderRadius: 20,
              transform: `rotate(${spots[n].rotate}deg)`,
              boxShadow: '0 28px 50px -22px rgba(88,28,135,0.45)',
            }}
          >
            <img src={src!} width={230} height={230} style={{ borderRadius: 12 }} />
            {item.priceNgn ? (
              <Naira amount={item.priceNgn} size={30} />
            ) : (
              <span style={{ fontFamily: 'Cormorant', fontSize: 28 }}>{item.title.slice(0, 18)}</span>
            )}
          </div>
        ))
      ) : (
        <img src={gift} width={540} height={568} style={{ position: 'absolute', right: 30, top: 40, objectFit: 'contain' }} />
      )}
    </Backdrop>,
  )
}

/** A profile's picture: their photo, name and how many lists they have. */
export async function profileImage({ owner, lists }: { owner: { displayName: string; avatarUrl: string | null }; lists: number }) {
  const avatar = await photo(owner.avatarUrl, 260, 260)
  return toJpeg(
    <Backdrop>
      <div style={{ display: 'flex', alignItems: 'center', gap: 64, padding: '0 90px', width: W }}>
        {avatar ? (
          <img src={avatar} width={300} height={300} style={{ borderRadius: 999, border: '8px solid white', boxShadow: '0 30px 60px -24px rgba(88,28,135,0.5)' }} />
        ) : (
          <div style={{ display: 'flex', width: 300, height: 300, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ede4fb', fontFamily: 'Cormorant', fontSize: 130, color: PURPLE }}>
            {owner.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          <Wordmark size={38} />
          <span style={{ fontFamily: 'Cormorant', fontSize: owner.displayName.length > 18 ? 72 : 96, lineHeight: 1 }}>{owner.displayName}</span>
          <span style={{ fontSize: 28, color: MUTED }}>
            {lists === 0 ? 'On GiftMe' : `${lists} ${lists === 1 ? 'wishlist' : 'wishlists'} to gift from`}
          </span>
          <Pill arrow>See their wishlists</Pill>
        </div>
      </div>
    </Backdrop>,
  )
}
