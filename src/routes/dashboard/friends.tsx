import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { DiscoverableSwitch, PersonCard } from '@/components/friends'
import { ErrorText, glassCard } from '@/components/ui'
import { contactHashes, parseVcf, type RawContact } from '@/lib/contacts'
import { inputClass, primaryButton, secondaryButton } from '@/lib/ui'
import { getFriendsFn, matchContactsFn, saveFindabilityFn, searchPeopleFn } from '@/server/fns/friends'
import type { Person } from '@/server/friends'

export const Route = createFileRoute('/dashboard/friends')({
  loader: () => getFriendsFn(),
  head: () => ({ meta: [{ title: 'Friends · GiftMe' }] }),
  component: Friends,
})

// The Contact Picker API (Android Chrome) isn't in TypeScript's DOM types yet.
type ContactsManager = {
  getProperties(): Promise<string[]>
  select(props: string[], opts: { multiple: boolean }): Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]>
}
const contactsApi = () => (typeof navigator !== 'undefined' ? ((navigator as unknown as { contacts?: ContactsManager }).contacts ?? null) : null)

function Friends() {
  const { me, following, known } = Route.useLoaderData()
  const router = useRouter()
  const upcoming = [...following].sort((a, b) => (a.next?.eventDate ?? '9999').localeCompare(b.next?.eventDate ?? '9999'))

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Friends</p>
        <h1 className="font-display text-5xl leading-none">
          Find your <span className="font-editorial text-6xl">people</span>
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          See which of your contacts are on GiftMe, follow them, and never miss a birthday, wedding or big day again.
        </p>
      </header>

      {!me.discoverable && (
        <TurnOnFinding
          onDone={() => router.invalidate()}
          save={(on) =>
            saveFindabilityFn({
              data: {
                phone: me.phone ?? '',
                discoverable: on,
                instagram: me.socials.instagram ?? '',
                tiktok: me.socials.tiktok ?? '',
                x: me.socials.x ?? '',
                substack: me.socials.substack ?? '',
              },
            })
          }
          hasPhone={!!me.phone}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FromContacts />
        <Search />
      </div>

      <PeopleSection
        title="Following"
        empty="Follow people to see their celebrations here, soonest first."
        people={upcoming}
        onChange={() => router.invalidate()}
      />
      {known.length > 0 && (
        <PeopleSection title="People you know" note="You’ve given to each other’s wishlists." people={known} onChange={() => router.invalidate()} />
      )}
    </div>
  )
}

function TurnOnFinding({ save, onDone, hasPhone }: { save: (on: boolean) => Promise<{ ok: boolean }>; onDone: () => void; hasPhone: boolean }) {
  const [on, setOn] = useState(false)
  return (
    <section className={`flex flex-col gap-3 rounded-3xl p-5 sm:p-6 ${glassCard}`}>
      <DiscoverableSwitch
        on={on}
        onChange={async (next) => {
          setOn(next)
          const res = await save(next).catch(() => ({ ok: false }))
          if (!res.ok) return setOn(!next)
          onDone()
        }}
      />
      {!hasPhone && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Add your phone number and socials in{' '}
          <a href="/dashboard/settings#friends" className="text-purple-700 underline dark:text-purple-300">
            settings
          </a>{' '}
          so friends can find you from their contacts.
        </p>
      )}
    </section>
  )
}

function FromContacts() {
  // Android Chrome can open the contact list directly; iPhone browsers can't, so iPhone gets export steps.
  const [platform, setPlatform] = useState<'picker' | 'iphone' | 'other'>('other')
  const supported = platform === 'picker'
  const [people, setPeople] = useState<Person[] | null>(null)
  const [checked, setChecked] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setPlatform(contactsApi() && 'ContactsManager' in window ? 'picker' : iphone ? 'iphone' : 'other')
  }, [])

  async function match(contacts: RawContact[]) {
    if (contacts.length === 0) return setError('No phone numbers or emails in those contacts.')
    setBusy(true)
    setError(null)
    const hashes = await contactHashes(contacts)
    const res = await matchContactsFn({ data: { hashes: hashes.slice(0, 5000) } }).catch(() => ({ ok: false as const, error: 'Please try again.' }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setChecked(contacts.length)
    setPeople(res.people)
  }

  async function pick() {
    const api = contactsApi()
    if (!api) return
    try {
      const available = await api.getProperties()
      const props = ['name', 'tel', 'email'].filter((p) => available.includes(p))
      const picked = await api.select(props, { multiple: true })
      await match(picked.map((c) => ({ name: c.name?.[0] ?? '', phones: c.tel ?? [], emails: c.email ?? [] })))
    } catch {
      // Closing the picker without choosing anyone isn't an error.
    }
  }

  async function readFile(f: File) {
    await match(parseVcf(await f.text()))
  }

  return (
    <section className={`flex flex-col gap-4 rounded-3xl p-5 sm:p-6 ${glassCard}`}>
      <div>
        <h2 className="font-display text-3xl">From your phone</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {supported
            ? 'Pick the contacts to check. Numbers are scrambled on your phone before we look, and we don’t keep them.'
            : 'See which of your contacts are already here. Numbers are scrambled on your device before we look, and we don’t keep them.'}
        </p>
        {platform === 'iphone' && (
          <details className="mt-3 rounded-xl border border-neutral-200/70 px-3.5 py-2.5 text-sm dark:border-neutral-800">
            <summary className="cursor-pointer text-neutral-700 dark:text-neutral-300">iPhone can’t share contacts with websites directly. Here’s the quick way</summary>
            <ol className="mt-2 list-decimal pl-5 leading-relaxed text-neutral-600 dark:text-neutral-400">
              <li>Open the Contacts app and tap Lists at the top left.</li>
              <li>Press and hold All Contacts, then tap Export and Save to Files.</li>
              <li>Come back here, tap Choose contacts file and pick it.</li>
            </ol>
          </details>
        )}
        {platform === 'other' && (
          <details className="mt-3 rounded-xl border border-neutral-200/70 px-3.5 py-2.5 text-sm dark:border-neutral-800">
            <summary className="cursor-pointer text-neutral-700 dark:text-neutral-300">How to get your contacts file</summary>
            <p className="mt-2 leading-relaxed text-neutral-600 dark:text-neutral-400">
              In Google Contacts, choose Export, then vCard. On an iPhone or Mac, export All Contacts from the Contacts app. Then choose that file here.
            </p>
          </details>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {supported && (
          <button type="button" onClick={pick} disabled={busy} className={`min-h-11 px-5 text-[15px] ${primaryButton}`}>
            {busy ? 'Checking…' : 'Choose contacts'}
          </button>
        )}
        <button type="button" onClick={() => file.current?.click()} disabled={busy} className={`min-h-11 px-5 text-[15px] ${supported ? secondaryButton : primaryButton}`}>
          {busy && !supported ? 'Checking…' : platform === 'iphone' ? 'Choose contacts file' : 'Upload a contacts file'}
        </button>
        <input
          ref={file}
          type="file"
          accept=".vcf,text/vcard,text/x-vcard"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) readFile(f)
            e.target.value = ''
          }}
        />
      </div>
      <ErrorText>{error}</ErrorText>
      {people && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {people.length > 0
              ? `${people.length} of your ${checked.toLocaleString()} contacts ${people.length === 1 ? 'is' : 'are'} on GiftMe.`
              : `None of your ${checked.toLocaleString()} contacts are on GiftMe yet.`}
          </p>
          {people.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {people.map((p) => (
                <PersonCard key={p.handle} person={p} />
              ))}
            </ul>
          ) : (
            <InviteButton />
          )}
        </div>
      )}
    </section>
  )
}

function Search() {
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Person[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (q.trim().replace(/^@/, '').length < 2) return setPeople(null)
    setBusy(true)
    const t = setTimeout(async () => {
      const res = await searchPeopleFn({ data: { q } }).catch(() => null)
      setBusy(false)
      setPeople(res?.ok ? res.people : [])
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <section className={`flex flex-col gap-4 rounded-3xl p-5 sm:p-6 ${glassCard}`}>
      <div>
        <h2 className="font-display text-3xl">Search</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          By name, GiftMe link, or the handle they use on Instagram, TikTok, X or Substack.
        </p>
      </div>
      <input className={inputClass} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ada, or @ada.lagos" aria-label="Search for people" />
      {busy && <p className="text-sm text-neutral-500">Looking…</p>}
      {people && !busy && people.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No one found. They may not be on GiftMe yet, or haven’t let friends find them.</p>
          <InviteButton />
        </div>
      )}
      {people && people.length > 0 && (
        <ul className="flex flex-col gap-3">
          {people.map((p) => (
            <PersonCard key={p.handle} person={p} />
          ))}
        </ul>
      )}
    </section>
  )
}

function InviteButton() {
  const { viewer } = Route.useRouteContext()
  const [copied, setCopied] = useState(false)
  const url = viewer.siteUrl
  const text = 'I’m on GiftMe, where friends make wishlists and chip in on each other’s gifts. Make yours:'
  async function invite() {
    if (navigator.share) {
      await navigator.share({ title: 'GiftMe', text, url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={invite} className={`min-h-10 px-4 text-sm ${primaryButton}`}>
        {copied ? 'Invite copied ✓' : 'Invite friends'}
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer" className={`inline-flex min-h-10 items-center px-4 text-sm ${secondaryButton}`}>
        Invite on WhatsApp
      </a>
    </div>
  )
}

function PeopleSection({ title, note, empty, people, onChange }: { title: string; note?: string; empty?: string; people: Person[]; onChange: () => void }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-3xl">{title}</h2>
        {note && <p className="text-sm text-neutral-500 dark:text-neutral-400">{note}</p>}
      </div>
      {people.length === 0 ? (
        <p className={`rounded-2xl px-5 py-6 text-[15px] text-neutral-600 dark:text-neutral-400 ${glassCard}`}>{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {people.map((p) => (
            <PersonCard key={p.handle} person={p} onFollowChange={onChange} />
          ))}
        </ul>
      )}
    </section>
  )
}
