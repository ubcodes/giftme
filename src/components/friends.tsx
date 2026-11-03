import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Avatar, ErrorText, Field, glassCard } from '@/components/ui'
import { SOCIALS, type SocialKey, type Socials } from '@/lib/contacts'
import { countdownText, formatDate } from '@/lib/dates'
import { occasion } from '@/lib/occasions'
import { inputClass, primaryButton, secondaryButton } from '@/lib/ui'
import { saveFindabilityFn, setFollowFn } from '@/server/fns/friends'
import type { Person } from '@/server/friends'
import type { Profile } from '@/server/users'

export function SocialIcon({ kind, size = 16 }: { kind: SocialKey; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  if (kind === 'instagram')
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  if (kind === 'tiktok')
    return (
      <svg {...common} fill="currentColor">
        <path d="M16.6 3c.4 2.2 1.8 3.7 4 3.9v3.1a7.4 7.4 0 0 1-4-1.2v6.4a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v3.2a2.7 2.7 0 1 0 1.8 2.5V3h3.1z" />
      </svg>
    )
  if (kind === 'x')
    return (
      <svg {...common} fill="currentColor">
        <path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5z" />
      </svg>
    )
  return (
    <svg {...common} fill="currentColor">
      <path d="M4 3h16v2.4H4zm0 4.4h16v2.4H4zM4 11.8h16V21l-8-4.5L4 21z" />
    </svg>
  )
}

export function SocialLinks({ socials, className = '' }: { socials: Socials; className?: string }) {
  const present = SOCIALS.filter((s) => socials[s.key])
  if (present.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {present.map((s) => (
        <a
          key={s.key}
          href={s.url(socials[s.key]!)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${s.label}: ${socials[s.key]}`}
          title={`${s.label} · ${socials[s.key]}`}
          className="grid size-8 place-items-center rounded-full border border-neutral-300/70 bg-white/50 text-neutral-600 transition-colors hover:text-purple-700 dark:border-neutral-700/70 dark:bg-white/5 dark:text-neutral-300 dark:hover:text-purple-300"
        >
          <SocialIcon kind={s.key} size={15} />
        </a>
      ))}
    </div>
  )
}

export function FollowButton({ handle, following, onChange }: { handle: string; following: boolean; onChange?: (following: boolean) => void }) {
  const [on, setOn] = useState(following)
  const [busy, setBusy] = useState(false)
  async function toggle() {
    setBusy(true)
    const next = !on
    setOn(next)
    const res = await setFollowFn({ data: { handle, follow: next } }).catch(() => ({ ok: false as const, error: '' }))
    setBusy(false)
    if (!res.ok) return setOn(!next)
    onChange?.(next)
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      className={`inline-flex min-h-9 shrink-0 items-center px-4 text-sm ${on ? secondaryButton : primaryButton}`}
    >
      {on ? 'Following' : 'Follow'}
    </button>
  )
}

/** One person: who they are, why they're here, and the celebration they have coming up. */
export function PersonCard({ person, onFollowChange }: { person: Person; onFollowChange?: (following: boolean) => void }) {
  const countdown = person.next?.eventDate ? countdownText(person.next.eventDate) : null
  return (
    <li className={`flex flex-col gap-4 rounded-2xl p-4 sm:p-5 ${glassCard}`}>
      <div className="flex items-center gap-3.5">
        <Avatar src={person.avatarUrl} name={person.displayName} size={52} zoom />
        <div className="min-w-0 flex-1">
          <Link to="/w/$handle" params={{ handle: person.handle }} className="font-display block truncate text-2xl leading-tight hover:underline">
            {person.displayName}
          </Link>
          <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
            @{person.handle}
            {person.reason && ` · ${person.reason}`}
          </p>
        </div>
        <FollowButton handle={person.handle} following={person.following} onChange={onFollowChange} />
      </div>
      {person.next && (
        <Link
          to="/w/$handle/$slug"
          params={{ handle: person.handle, slug: person.next.slug }}
          className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-white/50 px-3.5 py-2.5 transition-colors hover:border-purple-300/70 dark:border-neutral-800 dark:bg-white/5"
        >
          <span className="min-w-0">
            <span className="block truncate text-[15px]">{person.next.title}</span>
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
              {occasion(person.next.occasion).label}
              {person.next.eventDate && ` · ${formatDate(person.next.eventDate)}`}
            </span>
          </span>
          <span className="shrink-0 text-xs text-purple-700 dark:text-purple-300">{countdown ?? 'See wishlist'} →</span>
        </Link>
      )}
      <SocialLinks socials={person.socials} />
    </li>
  )
}

/** Settings: the phone number and handles friends can find you by, and the switch that allows it. */
export function FindabilityForm({ me, onSaved, submitLabel = 'Save', switchOnWhenFilled = false }: { me: Profile; onSaved: () => void; submitLabel?: string; switchOnWhenFilled?: boolean }) {
  const [phone, setPhone] = useState(me.phone ?? '')
  const [discoverable, setDiscoverableRaw] = useState(me.discoverable)
  // During setup, giving a number or handle here means "find me", unless they've flipped the switch themselves.
  const [touched, setTouched] = useState(false)
  const setDiscoverable = (on: boolean) => {
    setTouched(true)
    setDiscoverableRaw(on)
  }
  const filled = () => {
    if (switchOnWhenFilled && !touched) setDiscoverableRaw(true)
  }
  const [socials, setSocials] = useState<Record<SocialKey, string>>({
    instagram: me.socials.instagram ?? '',
    tiktok: me.socials.tiktok ?? '',
    x: me.socials.x ?? '',
    substack: me.socials.substack ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveFindabilityFn({ data: { phone, discoverable, ...socials } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <DiscoverableSwitch on={discoverable} onChange={setDiscoverable} />
      <Field label="Phone number" hint="friends who have it saved can find you">
        <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => (setPhone(e.target.value), filled())} placeholder="0803 123 4567" />
      </Field>
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          Your socials <span className="text-neutral-500 dark:text-neutral-400">· shown on your wishlists, and friends can search for them</span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-2.5 rounded-lg border border-neutral-300/70 px-3 focus-within:border-transparent focus-within:ring-1 focus-within:ring-purple-500/70 dark:border-neutral-700/70"
            >
              <span className="text-neutral-500 dark:text-neutral-400">
                <SocialIcon kind={s.key} />
              </span>
              <span className="sr-only">{s.label}</span>
              <input
                className="w-full min-w-0 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-neutral-400"
                value={socials[s.key]}
                onChange={(e) => {
                  setSocials((v) => ({ ...v, [s.key]: e.target.value }))
                  filled()
                }}
                placeholder={s.key === 'substack' ? 'yourname.substack.com' : `@your ${s.label} handle`}
                autoCapitalize="off"
                spellCheck={false}
              />
            </label>
          ))}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <button type="submit" disabled={busy} className={`min-h-12 text-[15px] ${primaryButton}`}>
        {busy ? 'Saving…' : saved ? 'Saved' : submitLabel}
      </button>
    </form>
  )
}

export function DiscoverableSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-neutral-200/70 bg-white/40 p-4 dark:border-neutral-800 dark:bg-white/5">
      <span>
        <span className="block text-[15px]">Let friends find me</span>
        <span className="mt-0.5 block text-sm text-neutral-500 dark:text-neutral-400">
          People who have your number or email, gave to your lists, or search your name can see your wishlists. Never amounts or who gave.
        </span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-purple-500 peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500/40 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 dark:bg-neutral-700"
      />
    </label>
  )
}
