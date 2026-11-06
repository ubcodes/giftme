import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { glassCard } from '@/components/ui'
import { primaryButton, secondaryButton } from '@/lib/ui'
import { admitFromWaitlistFn, getWaitlistAdminFn } from '@/server/fns/waitlist'
import { naira } from '@/lib/format'
import { getAdminStatsFn } from '@/server/fns/owner'

export const Route = createFileRoute('/dashboard/admin')({
  beforeLoad: ({ context }) => {
    if (!context.viewer.isAdmin) throw notFound()
  },
  loader: async () => ({ ...(await getAdminStatsFn()), waitlist: (await getWaitlistAdminFn()).people }),
  head: () => ({ meta: [{ title: 'Numbers · GiftMe' }] }),
  component: Admin,
})

/**
 * How GiftMe is doing: people, lists and gifts. Only emails in ADMIN_EMAILS can open it, and
 * nothing links here: the owner bookmarks /dashboard/admin. Everyone else gets a 404.
 */
function Admin() {
  const { totals: t, byDay, recent, waitlist } = Route.useLoaderData()
  const peak = Math.max(1, ...byDay.map((d) => d.n))
  const cards = [
    { label: 'People signed up', value: t.users.toLocaleString(), note: `${t.usersWeek} this week` },
    { label: 'Finished their profile', value: t.profiles.toLocaleString(), note: `${pct(t.profiles, t.users)} of sign-ups` },
    { label: 'Added a bank account', value: t.withBank.toLocaleString(), note: `${pct(t.withBank, t.profiles)} of profiles` },
    { label: 'Findable by friends', value: t.findable.toLocaleString(), note: 'Switched on “Let friends find me”' },
    { label: 'Wishlists', value: t.wishlists.toLocaleString(), note: `${t.items.toLocaleString()} gifts and funds on them` },
    { label: 'Gifts given', value: t.gifts.toLocaleString(), note: `${t.giftsWeek} this week · ${t.reservations} reserved` },
    { label: 'Money given', value: naira(t.raisedNgn), note: 'Confirmed payments, all time' },
  ]
  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">Only you can see this</p>
        <h1 className="font-display mt-2 text-5xl leading-none">
          GiftMe in <span className="font-editorial text-6xl">numbers</span>
        </h1>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className={`flex flex-col gap-1 rounded-2xl p-5 ${glassCard}`}>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{c.label}</span>
            <span className="font-display text-4xl leading-tight tabular-nums">{c.value}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{c.note}</span>
          </li>
        ))}
      </ul>

      <section className={`rounded-2xl p-5 sm:p-6 ${glassCard}`}>
        <h2 className="font-display text-2xl">Sign-ups, last 14 days</h2>
        <div className="mt-5 flex h-40 items-end gap-1.5" role="img" aria-label={byDay.map((d) => `${d.day}: ${d.n}`).join(', ')}>
          {byDay.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col justify-end gap-1.5" title={`${d.day}: ${d.n}`}>
              <span className="text-center text-[11px] text-neutral-500 tabular-nums">{d.n || ''}</span>
              <div className="rounded-t-md bg-purple-500/70" style={{ height: `${(d.n / peak) * 100}%`, minHeight: d.n ? 4 : 1 }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
          <span>{byDay[0].day.slice(5)}</span>
          <span>today</span>
        </div>
      </section>

      <WaitlistSection people={waitlist} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Newest people</h2>
        <ul className={`divide-y divide-neutral-200/70 rounded-2xl dark:divide-neutral-800 ${glassCard}`}>
          {recent.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span className="min-w-0 truncate">
                {r.name} {r.handle ? <span className="text-neutral-500">@{r.handle}</span> : <span className="text-neutral-500">· profile not finished</span>}
              </span>
              <span className="shrink-0 text-neutral-500 tabular-nums">
                {r.lists} {r.lists === 1 ? 'list' : 'lists'} · {new Date(r.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

type Person = { email: string; name: string | null; referrals: number; joined: number; admitted: number | null }

/** Everyone waiting, best place first. "Let in" emails them an invite and lets them sign up. */
function WaitlistSection({ people }: { people: Person[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const waiting = people.filter((p) => !p.admitted).length

  async function admit(email: string) {
    setBusy(email)
    setError(null)
    const res = await admitFromWaitlistFn({ data: { email } })
    setBusy(null)
    if (!res.ok) return setError(res.error)
    await router.invalidate()
  }

  function download() {
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : '')
    const lines = [
      ['email', 'name', 'invited friends', 'joined', 'let in'].map(cell).join(','),
      ...people.map((p) => [p.email, p.name ?? '', p.referrals, day(p.joined), day(p.admitted)].map(cell).join(',')),
    ]
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `giftme-waitlist-${day(Date.now())}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl">
          Waitlist <span className="text-base text-neutral-500">· {waiting} waiting, {people.length - waiting} let in</span>
        </h2>
        {people.length > 0 && (
          <button type="button" onClick={download} className={`min-h-9 px-4 text-sm ${secondaryButton}`}>
            Download CSV
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {people.length === 0 ? (
        <p className={`rounded-2xl px-5 py-4 text-sm text-neutral-500 ${glassCard}`}>Nobody on the waitlist yet.</p>
      ) : (
        <ul className={`max-h-[520px] divide-y divide-neutral-200/70 overflow-y-auto rounded-2xl dark:divide-neutral-800 ${glassCard}`}>
          {people.map((p, i) => (
            <li key={p.email} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span className="min-w-0">
                <span className="mr-2 text-neutral-500 tabular-nums">{p.admitted ? '✓' : `#${i + 1}`}</span>
                {p.name ?? 'No name'} <span className="block truncate text-xs text-neutral-500 sm:inline">{p.email}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-neutral-500">
                <span className="hidden tabular-nums sm:inline">
                  {p.referrals > 0 && `${p.referrals} invited · `}
                  {new Date(p.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                {p.admitted ? (
                  <span className="text-xs">let in</span>
                ) : (
                  <button type="button" disabled={busy === p.email} onClick={() => admit(p.email)} className={`min-h-8 px-3 text-xs ${primaryButton}`}>
                    {busy === p.email ? 'Letting in…' : 'Let in'}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '0%')
